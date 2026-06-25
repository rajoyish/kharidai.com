<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::with('items.productVariant.product')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(10);

        return Inertia::render('User/Orders/Index', [
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        $order->load(['items.productVariant.product', 'paymentReceipt', 'credentials', 'messages.user']);

        return Inertia::render('User/Orders/Show', [
            'order' => $order,
        ]);
    }

    public function storeMessage(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $message = $order->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
        ]);

        $message->load('user');
        \App\Events\OrderMessageCreated::dispatch($message);

        $admins = \App\Models\User::where('is_admin', true)->get();
        \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewMessageNotification($message));

        return redirect()->back()->with('success', 'Message sent.');
    }
}
