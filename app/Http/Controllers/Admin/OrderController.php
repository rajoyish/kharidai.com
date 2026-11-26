<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ProductType;
use App\Events\OrderMessageCreated;
use App\Http\Controllers\Concerns\AttachesProductGuides;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderCredential;
use App\Models\OrderItem;
use App\Models\PaymentReceipt;
use App\Models\Shipment;
use App\Notifications\NewMessageNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use App\Notifications\ProratedRefundIssuedNotification;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    use AttachesProductGuides;

    /**
     * One product type's orders for the selected year. `/admin/orders` is the
     * digital list, so links made before the lists were split still land on a
     * page of orders.
     */
    public function index(Request $request, ProductType $productType = ProductType::Digital): Response
    {
        $years = $this->yearsWithOrders();
        $selectedYear = $this->selectedYear($request, $years);
        $search = $request->string('search')->trim()->value();

        // items.serviceEngagements feeds the appended `profit` attribute, which is
        // serialized for every order below; without it each order lazy-loads.
        // A single year's orders are a bounded set, so the whole year is sent and
        // the page sorts each column client-side. This keeps the computed `profit`
        // column sortable, which a SQL sort could not offer.
        //
        // The items are only read to compute that profit, so they are left out of
        // the payload: a year of orders, each carrying its variants and full
        // product rows, made this one of the heaviest pages in the panel.
        $orders = Order::with(['user:id,name,email', 'paymentReceipt:id,order_id,status', 'items.serviceEngagements'])
            ->whereYear('created_at', $selectedYear)
            ->whereHas('items.productVariant.product', fn ($query) => $query->where('type', $productType))
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->get()
            // `uuid` is the order's URL key: every row links and acts through it.
            ->each(fn (Order $order): Order => $order->append('profit')->setVisible([
                'id', 'uuid', 'order_number', 'total_amount', 'status', 'profit', 'created_at',
                'refund_amount', 'refunded_on', 'refund_receipt_path', 'refund_note',
                'user', 'paymentReceipt',
            ]));

        return Inertia::render('Admin/Orders/Index', [
            'orders' => $orders,
            'productType' => [
                'value' => $productType->value,
                'label' => $productType->label(),
            ],
            'years' => $years,
            'filters' => [
                'year' => $selectedYear,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Orders an admin deleted, most recently deleted first. Not split by year
     * like the live list: someone looking for an order they just deleted should
     * not have to remember when it was placed.
     */
    public function deleted(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        $orders = Order::onlyTrashed()
            ->with(['user:id,name,email', 'items.productVariant.product:id,title,type'])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest('deleted_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total_amount' => (float) $order->total_amount,
                'customer' => $order->user?->only('name', 'email'),
                'products' => $order->items
                    ->map(fn ($item): ?string => $item->productVariant?->product?->title)
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
                'types' => $order->items
                    ->map(fn ($item): ?ProductType => $item->productVariant?->product?->type)
                    ->filter()
                    ->unique(fn (ProductType $type): string => $type->value)
                    ->map(fn (ProductType $type): array => ['value' => $type->value, 'label' => $type->label()])
                    ->values()
                    ->all(),
                'placed_on' => $order->created_at?->toFormattedDateString(),
                'deleted_ago' => $order->deleted_at?->diffForHumans(),
                'deleted_at' => $order->deleted_at?->toDayDateTimeString(),
            ]);

        return Inertia::render('Admin/Orders/Deleted', [
            'orders' => $orders,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Order $order): Response|RedirectResponse
    {
        // Bound with trashed so a notification that links to a deleted order
        // explains itself instead of answering 404.
        if ($order->trashed()) {
            return redirect()->route('admin.orders.index')
                ->with('error', "Order {$order->order_number} is deleted. Restore it from Orders › Deleted to open it.");
        }

        $order->load(['items.productVariant.product', 'items.serviceEngagements', 'user', 'paymentReceipt', 'credentials', 'messages.user', 'subscriptions.orderItem.productVariant.product', 'shipment', 'shippingAddress']);

        // Cost and margin are hidden on the models so customer pages cannot leak
        // them; this is the one page that shows them.
        $order->append('profit');
        $order->items->each(fn (OrderItem $item): OrderItem => $item->makeVisible('purchase_price'));

        // Engagements without a saved invoice are still listed so the lifecycle
        // status stays visible while the brief is being prepared.
        $order->items->each(function ($item): void {
            $item->setAttribute('service_invoices', $item->serviceEngagements
                ->map(fn ($engagement): array => [
                    'id' => $engagement->id,
                    'status' => $engagement->status->value,
                    'status_label' => $engagement->status->label(),
                    'project_name' => $engagement->project_name,
                    'line_items' => $engagement->line_items ?? [],
                    'subtotal_npr' => $engagement->subtotalNpr(),
                    'tax_rate' => (float) $engagement->tax_rate,
                    'tax_npr' => $engagement->taxNpr(),
                    'grand_total_npr' => $engagement->grandTotalNpr(),
                    'advance_paid_npr' => $engagement->advance_paid_npr,
                    'due_npr' => $engagement->outstandingNpr(),
                    'payment_status' => $engagement->paymentStatus(),
                    'project_completion_date' => $engagement->project_completion_date?->format('n/j/Y'),
                ])
                ->values()->all());

            $item->makeHidden('serviceEngagements');
        });

        // What the buyer sees on their own order page, drafts included so the
        // admin can check one before releasing it. Empty until the order is paid.
        $this->attachAdminDeliveryGuides($order);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order,
            'shipmentStatuses' => Shipment::STATUSES,
        ]);
    }

    public function updateShipmentStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Shipment::STATUSES)],
        ]);

        $shipment = $order->shipment;

        if ($shipment === null) {
            return redirect()->back()->with('error', 'This order has no shipment to update.');
        }

        $shipment->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Shipment status updated.');
    }

    public function markBalancePaid(Order $order): RedirectResponse
    {
        $order->update(['balance_due' => 0]);

        return redirect()->back()->with('success', 'Balance marked as paid.');
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,delivering,completed',
        ]);

        $previousStatus = $order->status;

        $order->update(['status' => $validated['status']]);

        if ($validated['status'] === 'completed' && $previousStatus !== 'completed') {
            $this->createSubscriptionsForCompletedItems($order);
        }

        $order->user->notify(new OrderStatusUpdatedNotification($order, $validated['status']));

        return redirect()->back()->with('success', 'Order status updated.');
    }

    public function updateReceiptStatus(Request $request, PaymentReceipt $paymentReceipt): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
        ]);

        $paymentReceipt->update(['status' => $validated['status']]);

        if ($validated['status'] === 'approved') {
            $paymentReceipt->order->update(['status' => 'delivering']);
            $paymentReceipt->order->user->notify(new OrderStatusUpdatedNotification($paymentReceipt->order, 'delivering'));
        }

        return redirect()->back()->with('success', 'Receipt status updated.');
    }

    public function storeCredential(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $order->credentials()->create([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential added.');
    }

    public function updateCredential(Request $request, Order $order, OrderCredential $credential): RedirectResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $credential->update([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential updated.');
    }

    public function destroyCredential(Order $order, OrderCredential $credential): RedirectResponse
    {
        $credential->delete();

        return redirect()->back()->with('success', 'Digital credential deleted.');
    }

    public function storeMessage(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $message = $order->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
        ]);

        $message->load('user');
        OrderMessageCreated::dispatch($message);
        $order->user->notify(new NewMessageNotification($message));

        return redirect()->back()->with('success', 'Message sent.');
    }

    /**
     * Record, or correct, the prorated refund handed back on a paid order. The
     * screenshot is required the first time and optional on an edit, so fixing a
     * mistyped amount does not mean re-uploading the proof.
     */
    public function saveRefund(Request $request, Order $order): RedirectResponse
    {
        abort_unless($order->isPaid(), 422, 'Only a paid order can be refunded.');

        $order->loadMissing('items.serviceEngagements');

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:'.$order->displayTotalNpr()],
            'refunded_on' => ['required', 'date', 'after_or_equal:'.$order->created_at->toDateString(), 'before_or_equal:today'],
            'receipt' => [$order->refund_receipt_path === null ? 'required' : 'nullable', 'image', 'max:2048'],
            'note' => ['nullable', 'string', 'max:1000'],
        ], [
            'amount.max' => 'The refund cannot exceed the order total of Rs. '.number_format($order->displayTotalNpr(), 2).'.',
            'refunded_on.after_or_equal' => 'The refund date cannot be before the order was placed.',
        ]);

        $isNewRefund = ! $order->hasProratedRefund();
        $previousReceiptPath = $order->refund_receipt_path;

        $receiptPath = $request->hasFile('receipt')
            ? $request->file('receipt')->store('refund-receipts', 'public')
            : $previousReceiptPath;

        $order->update([
            'refund_amount' => $validated['amount'],
            'refunded_on' => $validated['refunded_on'],
            'refund_receipt_path' => $receiptPath,
            'refund_note' => $validated['note'] ?? null,
        ]);

        if ($previousReceiptPath !== null && $previousReceiptPath !== $receiptPath) {
            Storage::disk('public')->delete($previousReceiptPath);
        }

        if ($isNewRefund) {
            $order->user->notify(new ProratedRefundIssuedNotification($order));
        }

        return redirect()->back()->with('success', $isNewRefund ? 'Prorated refund recorded.' : 'Prorated refund updated.');
    }

    /**
     * Remove a refund recorded in error. The order's profit and tithe return to
     * what they were before it.
     */
    public function destroyRefund(Order $order): RedirectResponse
    {
        $receiptPath = $order->refund_receipt_path;

        $order->update([
            'refund_amount' => null,
            'refunded_on' => null,
            'refund_receipt_path' => null,
            'refund_note' => null,
        ]);

        if ($receiptPath !== null) {
            Storage::disk('public')->delete($receiptPath);
        }

        return redirect()->back()->with('success', 'Prorated refund removed.');
    }

    /**
     * Move the order to the deleted list. Nothing attached to it is touched, so
     * a restore brings back the receipt, shipment and subscriptions as they were.
     */
    public function destroy(Order $order): RedirectResponse
    {
        $order->delete();

        $productType = $this->productTypeOf($order);

        // Digital is the bare `/admin/orders`; the route has no `digital` segment.
        return redirect()
            ->route('admin.orders.index', $productType === ProductType::Digital ? [] : ['productType' => $productType])
            ->with('success', "Order {$order->order_number} moved to Orders › Deleted.");
    }

    public function restore(Order $order): RedirectResponse
    {
        abort_unless($order->trashed(), 404);

        $order->restore();

        return redirect()->back()->with('success', "Order {$order->order_number} restored.");
    }

    /**
     * Erase a deleted order for good: the database cascades take its items,
     * shipment and subscriptions, and the receipt files go with it. Only an
     * order already in the deleted list can be erased, so one click never
     * destroys a live order.
     */
    public function forceDestroy(Order $order): RedirectResponse
    {
        abort_unless($order->trashed(), 404);

        $order->loadMissing('paymentReceipt');
        $receiptPaths = array_filter([$order->paymentReceipt?->file_path, $order->refund_receipt_path]);

        $order->forceDelete();

        if ($receiptPaths !== []) {
            Storage::disk('public')->delete($receiptPaths);
        }

        return redirect()->back()->with('success', "Order {$order->order_number} permanently deleted.");
    }

    public function allowReceiptReupload(Request $request, Order $order): RedirectResponse
    {
        $order->update([
            'can_reupload_receipt' => true,
            'request_receipt_upload' => false,
        ]);

        return redirect()->back()->with('success', 'User can now re-upload receipt.');
    }

    /**
     * The list an order belongs to, so deleting one from its page returns the
     * admin to the list they came from. Orders hold one type in practice;
     * anything unclassifiable falls back to the default list.
     */
    private function productTypeOf(Order $order): ProductType
    {
        $order->loadMissing('items.productVariant.product');

        return $order->items->first()?->productVariant?->product?->type ?? ProductType::Digital;
    }

    /**
     * Every year that holds an order, newest first. The current year is always
     * offered too, so a year without orders yet is still selectable.
     *
     * @return list<int>
     */
    private function yearsWithOrders(): array
    {
        $years = Order::query()
            ->whereNotNull('created_at')
            ->pluck('created_at')
            ->map(fn (CarbonInterface $createdAt): int => $createdAt->year)
            ->push((int) CarbonImmutable::now()->year)
            ->unique()
            ->sortDesc()
            ->all();

        return array_values($years);
    }

    /**
     * @param  list<int>  $years
     */
    private function selectedYear(Request $request, array $years): int
    {
        $requestedYear = $request->integer('year');

        return in_array($requestedYear, $years, true)
            ? $requestedYear
            : (int) CarbonImmutable::now()->year;
    }

    private function createSubscriptionsForCompletedItems(Order $order): void
    {
        $order->loadMissing(['items.productVariant', 'items.subscriptions']);

        foreach ($order->items as $item) {
            $validityMonths = $item->productVariant->validity_months;

            if ($validityMonths === null) {
                continue;
            }

            // Calendar months, clamped to the month's last day: a one-month
            // plan bought on 31 January ends on 28 (or 29) February, not 3 March.
            $startDate = today();
            $endDate = $startDate->copy()->addMonthsNoOverflow($validityMonths);
            $missingSubscriptions = max($item->quantity - $item->subscriptions->count(), 0);

            if ($missingSubscriptions === 0) {
                continue;
            }

            $subscriptionAttributes = [
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ];

            $item->subscriptions()->createMany(
                array_fill(0, $missingSubscriptions, $subscriptionAttributes),
            );
        }
    }
}
