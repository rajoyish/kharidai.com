<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function index(Request $request): Response
    {
        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);
        $cart->load('items.productVariant.product');

        return Inertia::render('Cart/Index', [
            'cart' => $cart,
        ]);
    }

    public function add(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'brief' => 'nullable|string|max:5000',
            'selected_options' => 'nullable|array',
            'selected_options.color' => 'nullable|string',
            'selected_options.size' => 'nullable|string',
        ]);

        $variant = ProductVariant::query()->where('id', $validated['product_variant_id'])->firstOrFail();
        $selectedOptions = $this->resolveSelectedOptions($request, $variant);

        $brief = ! empty($validated['brief']) ? ['note' => $validated['brief']] : null;

        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);

        // The same variant chosen with different options is a distinct line, so
        // only merge quantities when the selected options also match.
        $cartItem = $cart->items()
            ->where('product_variant_id', $validated['product_variant_id'])
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
                'product_variant_id' => $validated['product_variant_id'],
                'quantity' => $validated['quantity'],
                'brief' => $brief,
                'selected_options' => $selectedOptions,
            ]);
        }

        return redirect()->back()->with('success', 'Added to cart.');
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
