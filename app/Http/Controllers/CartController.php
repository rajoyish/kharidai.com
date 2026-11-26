<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $cart = Cart::where('user_id', $userId)->first() ?? DB::transaction(function () use ($userId): Cart {
            Cart::lockOwner($userId);

            return Cart::firstOrCreate(['user_id' => $userId]);
        });

        // Only the columns the page and the free-service check read. The full
        // rows drag along product descriptions and the variant's purchase price,
        // which are dead weight in a payload the shopper waits on.
        $cart->load([
            'items:id,cart_id,product_variant_id,quantity,selected_options',
            'items.productVariant:id,product_id,name,price_npr',
            'items.productVariant.product:id,type,title,image,in_stock,is_visible',
        ]);

        // A deletion can cascade after the items query but before the eager loads.
        $cart->setRelation('items', $cart->items
            ->filter(fn (CartItem $item): bool => $item->productVariant?->product !== null)
            ->values());

        $hasUnavailableItems = $cart->unavailableItems()->isNotEmpty();

        // A cart of only free services (zero price) needs neither shipping
        // details nor a payment step, so it can be placed straight from the cart
        // without the checkout page.

        return Inertia::render('Cart/Index', [
            'cart' => [
                'id' => $cart->id,
                'items' => $cart->items->map(fn (CartItem $item): array => [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'selected_options' => $item->selected_options,
                    'is_available' => $item->productVariant->product->isPurchasable(),
                    'product_variant' => [
                        'id' => $item->productVariant->id,
                        'name' => $item->productVariant->name,
                        'price_npr' => $item->productVariant->price_npr,
                        'product' => [
                            'id' => $item->productVariant->product->id,
                            'title' => $item->productVariant->product->title,
                            'image' => $item->productVariant->product->image,
                        ],
                    ],
                ])->all(),
            ],
            'canCheckoutDirectly' => ! $hasUnavailableItems && $cart->isFreeServiceOrder(),
            'hasUnavailableItems' => $hasUnavailableItems,
        ]);
    }

    public function add(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|integer',
            'quantity' => 'required|integer|min:1',
            'brief' => 'nullable|string|max:5000',
            'selected_options' => 'nullable|array',
            'selected_options.color' => 'nullable|string',
            'selected_options.size' => 'nullable|string',
        ]);

        $added = DB::transaction(function () use ($request, $validated): bool {
            $userId = $request->user()->id;
            Cart::lockOwner($userId);

            // Keep the variant available for the foreign key until the cart line is saved.
            $variant = ProductVariant::query()
                ->with('product:id,in_stock,is_visible')
                ->whereKey($validated['product_variant_id'])
                ->sharedLock()
                ->first();

            if (! $variant?->product?->isPurchasable()) {
                return false;
            }

            $selectedOptions = $this->resolveSelectedOptions($request, $variant);
            $brief = ! empty($validated['brief']) ? ['note' => $validated['brief']] : null;
            $cart = Cart::firstOrCreate(['user_id' => $userId]);

            // Different option choices for the same variant stay on separate lines.
            $cartItem = $cart->items()
                ->where('product_variant_id', $variant->id)
                ->get()
                ->first(fn (CartItem $item): bool => $item->selected_options == $selectedOptions);

            if ($cartItem) {
                $cartItem->quantity += $validated['quantity'];
                if ($brief !== null) {
                    $cartItem->brief = $brief;
                }
                $cartItem->save();
            } else {
                $cart->items()->create([
                    'product_variant_id' => $variant->id,
                    'quantity' => $validated['quantity'],
                    'brief' => $brief,
                    'selected_options' => $selectedOptions,
                ]);
            }

            return true;
        });

        Inertia::flash('toast', $added
            ? ['type' => 'success', 'message' => 'Added to cart.']
            : ['type' => 'error', 'message' => 'This product is no longer available.']);

        return redirect()->route('cart.index');
    }

    /**
     * Resolve the shopper's chosen options against what the variant offers.
     * When the variant lists colors or sizes, a matching choice is required;
     * an unknown or missing choice fails validation. Returns null when the
     * variant offers no options.
     *
     * @return array<string, string>|null
     */
    protected function resolveSelectedOptions(Request $request, ProductVariant $variant): ?array
    {
        $selected = [];

        $available = [
            'color' => $variant->colors ?? [],
            'size' => $variant->sizes ?? [],
        ];

        foreach ($available as $key => $options) {
            if ($options === []) {
                continue;
            }

            $choice = $request->input("selected_options.{$key}");

            if (! is_string($choice) || ! in_array($choice, $options, true)) {
                throw ValidationException::withMessages([
                    "selected_options.{$key}" => "Please select a {$key}.",
                ]);
            }

            $selected[$key] = $choice;
        }

        return $selected === [] ? null : $selected;
    }

    public function update(Request $request, CartItem $cartItem): RedirectResponse
    {
        if ($cartItem->cart->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cartItem->update(['quantity' => $validated['quantity']]);

        return redirect()->back()->with('success', 'Cart updated.');
    }

    public function remove(Request $request, CartItem $cartItem): RedirectResponse
    {
        if ($cartItem->cart->user_id !== $request->user()->id) {
            abort(403);
        }

        $cartItem->delete();

        return redirect()->back()->with('success', 'Item removed from cart.');
    }
}
