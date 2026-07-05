<?php

namespace App\Http\Controllers;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\PaymentOption;
use App\Enums\ProductType;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ShippingAddress;
use App\Models\ShippingZone;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\PaymentReceiptUploadedNotification;
use App\Services\Engagements\EngagementStateMachine;
use App\Services\Shipping\ShippingCalculator;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function index(Request $request, ShippingCalculator $calculator)
    {
        $cart = Cart::with(['items.productVariant.product.physicalDetail'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        $physicalItems = $this->physicalItems($cart->items);
        $hasPhysicalItems = $physicalItems->isNotEmpty();

        $zones = [];
        $addresses = [];

        if ($hasPhysicalItems) {
            $shippingZones = ShippingZone::query()->active()->with('rate')->orderBy('sort_order')->get();
            $fees = $calculator->feesForZones($shippingZones, $physicalItems);

            $zones = $shippingZones->map(fn (ShippingZone $zone): array => [
                'id' => $zone->id,
                'name' => $zone->name,
                'fee' => $fees[$zone->id] ?? 0,
                'min_days' => $zone->rate?->min_days,
                'max_days' => $zone->rate?->max_days,
            ])->all();

            $addresses = $request->user()->shippingAddresses()->latest('is_default')->latest()->get();
        }

        return Inertia::render('Checkout/Index', [
            'cart' => $cart,
            'hasPhysicalItems' => $hasPhysicalItems,
            'isPhysicalOnly' => $hasPhysicalItems && $physicalItems->count() === $cart->items->count(),
            'zones' => $zones,
            'addresses' => $addresses,
        ]);
    }

    public function process(Request $request, ShippingCalculator $calculator)
    {
        $cart = Cart::with(['items.productVariant.product.physicalDetail'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        $physicalItems = $this->physicalItems($cart->items);
        $hasPhysicalItems = $physicalItems->isNotEmpty();
        $isPhysicalOnly = $hasPhysicalItems && $physicalItems->count() === $cart->items->count();

        $validated = $request->validate($this->checkoutRules($hasPhysicalItems, $isPhysicalOnly));

        $itemsTotal = $cart->items->sum(
            fn ($item): float => (float) $item->productVariant->price_npr * $item->quantity,
        );

        $shippingTotal = 0.0;
        $zone = null;

        if ($hasPhysicalItems) {
            $zone = ShippingZone::with('rate')->find($validated['shipping_zone_id']);
            $shippingTotal = $calculator->forItems($zone, $physicalItems);
        }

        $paymentOption = $hasPhysicalItems ? PaymentOption::from($validated['payment_option']) : null;
        $totalAmount = $itemsTotal + $shippingTotal;

        $amountDueNow = $paymentOption === PaymentOption::ShippingOnly ? $shippingTotal : $totalAmount;
        $balanceDue = $paymentOption === PaymentOption::ShippingOnly ? $itemsTotal : 0.0;

        $order = DB::transaction(function () use (
            $request, $cart, $validated, $hasPhysicalItems, $zone,
            $itemsTotal, $shippingTotal, $totalAmount, $amountDueNow, $balanceDue, $paymentOption
        ) {
            $shippingAddress = $hasPhysicalItems ? $this->resolveShippingAddress($request, $validated) : null;

            $order = Order::create([
                'order_number' => 'ORD-'.strtoupper(Str::random(10)),
                'user_id' => $request->user()->id,
                'status' => 'pending',
                'total_amount' => $totalAmount,
                'items_total' => $itemsTotal,
                'shipping_total' => $shippingTotal,
                'amount_due_now' => $amountDueNow,
                'balance_due' => $balanceDue,
                'payment_option' => $paymentOption,
                'shipping_address_id' => $shippingAddress?->id,
                'additional_data' => ! empty($validated['additional_data']) ? ['note' => $validated['additional_data']] : null,
            ]);

            foreach ($cart->items as $item) {
                $orderItem = $order->items()->create([
                    'product_variant_id' => $item->product_variant_id,
                    'price' => $item->productVariant->price_npr,
                    'purchase_price' => $item->productVariant->purchase_price_npr,
                    'quantity' => $item->quantity,
                ]);

                $this->createServiceEngagements($orderItem, $item);
            }

            if ($hasPhysicalItems) {
                $order->shipment()->create([
                    'status' => 'pending',
                    'recipient_name' => $validated['recipient_name'],
                    'mobile_number' => $validated['mobile_number'],
                    'address_line' => $validated['address_line'],
                    'city' => $validated['city'],
                    'landmark' => $validated['landmark'] ?? null,
                    'zone_name' => $zone?->name,
                ]);
            }

            return $order;
        });

        $admins = User::where('is_admin', true)->get();
        Notification::send($admins, new OrderPlacedNotification($order));

        $cart->items()->delete();
        $cart->delete();

        return redirect()->route('checkout.npr', $order);
    }

    /**
     * Spawn one service engagement per unit for a service order item, snapshotting
     * the service's pricing terms and entering the correct gated lifecycle state
     * (pending contract / awaiting advance / in progress) for that service.
     */
    private function createServiceEngagements(OrderItem $orderItem, CartItem $cartItem): void
    {
        $product = $cartItem->productVariant->product;

        if ($product->type !== ProductType::Service) {
            return;
        }

        $detail = $product->serviceDetail;
        $machine = app(EngagementStateMachine::class);
        $variant = $cartItem->productVariant;

        $attributes = [
            'user_id' => $orderItem->order->user_id,
            'product_id' => $product->id,
            'product_variant_id' => $orderItem->product_variant_id,
            'source' => EngagementSource::Storefront,
            'status' => $detail ? $machine->initialStatusFor($detail) : EngagementStatus::InProgress,
            'price_npr' => $variant->price_npr,
            'purchase_price_npr' => $variant->purchase_price_npr,
            'pricing_strategy' => $detail?->pricing_strategy,
            'pricing_config' => $detail?->pricing_config,
            'advance_required_npr' => $detail?->advanceAmountNpr($variant->price_npr) ?? 0.0,
            'brief' => $cartItem->brief,
        ];

        $orderItem->serviceEngagements()->createMany(
            array_fill(0, $orderItem->quantity, $attributes),
        );
    }

    /**
     * The cart items whose product is a physical product.
     *
     * @param  EloquentCollection<int, CartItem>  $items
     * @return EloquentCollection<int, CartItem>
     */
    private function physicalItems(EloquentCollection $items): EloquentCollection
    {
        return $items->filter(
            fn ($item): bool => $item->productVariant->product->type === ProductType::Physical,
        )->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function checkoutRules(bool $hasPhysicalItems, bool $isPhysicalOnly): array
    {
        $rules = ['additional_data' => 'nullable|string'];

        if (! $hasPhysicalItems) {
            return $rules;
        }

        $allowedPaymentOptions = $isPhysicalOnly
            ? [PaymentOption::Full->value, PaymentOption::ShippingOnly->value]
            : [PaymentOption::Full->value];

        return $rules + [
            'shipping_zone_id' => ['required', Rule::exists('shipping_zones', 'id')->where('is_active', true)],
            'recipient_name' => ['required', 'string', 'max:255'],
            'mobile_number' => ['required', 'string', 'max:30'],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'save_address' => ['nullable', 'boolean'],
            'payment_option' => ['required', Rule::in($allowedPaymentOptions)],
        ];
    }

    /**
     * Persist the shipping address for reuse when the customer opts to save it.
     *
     * @param  array<string, mixed>  $validated
     */
    private function resolveShippingAddress(Request $request, array $validated): ?ShippingAddress
    {
        if (empty($validated['save_address'])) {
            return null;
        }

        $hasDefault = $request->user()->shippingAddresses()->where('is_default', true)->exists();

        return $request->user()->shippingAddresses()->create([
            'shipping_zone_id' => $validated['shipping_zone_id'],
            'recipient_name' => $validated['recipient_name'],
            'mobile_number' => $validated['mobile_number'],
            'address_line' => $validated['address_line'],
            'city' => $validated['city'],
            'landmark' => $validated['landmark'] ?? null,
            'is_default' => ! $hasDefault,
        ]);
    }

    public function nprPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending') {
            abort(403);
        }

        if ($order->paymentReceipt && ! $order->can_reupload_receipt) {
            return redirect()->route('orders.show', $order)->with('error', 'Receipt already uploaded.');
        }

        return Inertia::render('Checkout/NprPayment', [
            'order' => $order->load('items.productVariant.product', 'shipment'),
        ]);
    }

    public function processNprPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending') {
            abort(403);
        }

        if ($order->paymentReceipt && ! $order->can_reupload_receipt) {
            return redirect()->route('orders.show', $order)->with('error', 'Receipt already uploaded.');
        }

        $validated = $request->validate([
            'receipt' => 'required|image|max:2048',
        ]);

        if ($order->paymentReceipt) {
            Storage::disk('public')->delete($order->paymentReceipt->file_path);
            $order->paymentReceipt()->delete();
        }

        $path = $request->file('receipt')->store('receipts', 'public');

        $order->paymentReceipt()->create([
            'file_path' => $path,
            'status' => 'pending',
        ]);

        $order->update([
            'can_reupload_receipt' => false,
            'request_receipt_upload' => false,
        ]);

        $admins = User::where('is_admin', true)->get();
        Notification::send($admins, new PaymentReceiptUploadedNotification($order));

        // Keep order status as pending until admin reviews the receipt
        return redirect()->route('orders.show', $order)->with('success', 'Receipt uploaded successfully. We will process your order soon.');
    }
}
