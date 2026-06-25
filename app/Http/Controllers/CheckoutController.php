<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    public function index(Request $request)
    {
        $cart = Cart::with(['items.productVariant.product'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$cart || $cart->items->isEmpty()) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        return Inertia::render('Checkout/Index', [
            'cart' => $cart,
        ]);
    }

    public function process(Request $request)
    {
        $cart = Cart::with(['items.productVariant'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$cart || $cart->items->isEmpty()) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        $validated = $request->validate([
            'currency' => 'required|in:npr,usd',
            'additional_data' => 'nullable|string',
        ]);

        $totalAmount = 0;
        foreach ($cart->items as $item) {
            $price = $validated['currency'] === 'npr' ? $item->productVariant->price_npr : $item->productVariant->price_usd;
            $totalAmount += $price * $item->quantity;
        }

        $order = Order::create([
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'total_amount' => $totalAmount,
            'currency' => $validated['currency'],
            'additional_data' => $validated['additional_data'] ? json_encode(['note' => $validated['additional_data']]) : null,
        ]);

        foreach ($cart->items as $item) {
            $price = $validated['currency'] === 'npr' ? $item->productVariant->price_npr : $item->productVariant->price_usd;
            $purchasePrice = $validated['currency'] === 'npr' ? $item->productVariant->purchase_price_npr : $item->productVariant->purchase_price_usd;
            $order->items()->create([
                'product_variant_id' => $item->product_variant_id,
                'price' => $price,
                'purchase_price' => $purchasePrice,
                'quantity' => $item->quantity,
            ]);
        }

        $cart->items()->delete();
        $cart->delete();

        $admins = \App\Models\User::where('is_admin', true)->get();
        \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\OrderPlacedNotification($order));

        if ($validated['currency'] === 'npr') {
            return redirect()->route('checkout.npr', $order);
        }

        return redirect()->route('checkout.usd.mock', $order);
    }

    public function nprPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending' || $order->currency !== 'npr') {
            abort(403);
        }

        return Inertia::render('Checkout/NprPayment', [
            'order' => $order->load('items.productVariant.product'),
        ]);
    }

    public function processNprPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending' || $order->currency !== 'npr') {
            abort(403);
        }

        $validated = $request->validate([
            'receipt' => 'required|image|max:2048',
        ]);

        $path = $request->file('receipt')->store('receipts', 'public');

        $order->paymentReceipt()->create([
            'file_path' => $path,
            'status' => 'pending',
        ]);

        $admins = \App\Models\User::where('is_admin', true)->get();
        \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\PaymentReceiptUploadedNotification($order));

        // Keep order status as pending until admin reviews the receipt
        return redirect()->route('orders.show', $order)->with('success', 'Receipt uploaded successfully. We will process your order soon.');
    }

    public function mockPocketsflow(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending' || $order->currency !== 'usd') {
            abort(403);
        }

        return Inertia::render('Checkout/MockPocketsflow', [
            'order' => $order,
        ]);
    }

    public function processMockPocketsflow(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending' || $order->currency !== 'usd') {
            abort(403);
        }

        $order->update(['status' => 'delivering']);

        return redirect()->route('orders.show', $order)->with('success', 'Payment successful! Your order is being processed.');
    }
}
