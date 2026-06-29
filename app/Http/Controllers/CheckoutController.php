<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\PaymentReceiptUploadedNotification;
use App\Services\PocketsflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function index(Request $request)
    {
        $cart = Cart::with(['items.productVariant.product'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
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

        if (! $cart || $cart->items->isEmpty()) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        $validated = $request->validate([
            'additional_data' => 'nullable|string',
        ]);

        $totalAmount = 0;
        foreach ($cart->items as $item) {
            $price = $item->productVariant->price_npr;
            $totalAmount += $price * $item->quantity;
        }

        $order = Order::create([
            'order_number' => 'ORD-'.strtoupper(Str::random(10)),
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'total_amount' => $totalAmount,
            'additional_data' => !empty($validated['additional_data']) ? ['note' => $validated['additional_data']] : null,
        ]);

        foreach ($cart->items as $item) {
            $price = $item->productVariant->price_npr;
            $purchasePrice = $item->productVariant->purchase_price_npr;
            $order->items()->create([
                'product_variant_id' => $item->product_variant_id,
                'price' => $price,
                'purchase_price' => $purchasePrice,
                'quantity' => $item->quantity,
            ]);
        }

        $admins = User::where('is_admin', true)->get();
        Notification::send($admins, new OrderPlacedNotification($order));

        $cart->items()->delete();
        $cart->delete();
        return redirect()->route('checkout.npr', $order);
    }

    public function nprPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending') {
            abort(403);
        }

        return Inertia::render('Checkout/NprPayment', [
            'order' => $order->load('items.productVariant.product'),
        ]);
    }

    public function processNprPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id || $order->status !== 'pending') {
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

        $admins = User::where('is_admin', true)->get();
        Notification::send($admins, new PaymentReceiptUploadedNotification($order));

        // Keep order status as pending until admin reviews the receipt
        return redirect()->route('orders.show', $order)->with('success', 'Receipt uploaded successfully. We will process your order soon.');
    }

}
