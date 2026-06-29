<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);
        $cart->load('items.productVariant.product');

        return Inertia::render('Cart/Index', [
            'cart' => $cart,
        ]);
    }

    public function add(Request $request)
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);

        $cartItem = $cart->items()->where('product_variant_id', $validated['product_variant_id'])->first();

        if ($cartItem) {
            $cartItem->quantity += $validated['quantity'];
            $cartItem->save();
        } else {
            $cart->items()->create([
                'product_variant_id' => $validated['product_variant_id'],
                'quantity' => $validated['quantity'],
            ]);
        }

        return redirect()->route('cart.index')->with('success', 'Added to cart.');
    }

    public function update(Request $request, CartItem $cartItem)
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

    public function remove(Request $request, CartItem $cartItem)
    {
        if ($cartItem->cart->user_id !== $request->user()->id) {
            abort(403);
        }

        $cartItem->delete();

        return redirect()->back()->with('success', 'Item removed from cart.');
    }
}
