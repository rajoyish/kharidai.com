<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentReceipt;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::with(['user', 'paymentReceipt', 'items'])
            ->latest()
            ->paginate(15);

        return Inertia::render('Admin/Orders/Index', [
            'orders' => $orders,
        ]);
    }

    public function show(Order $order)
    {
        $order->load(['items.productVariant.product', 'user', 'paymentReceipt', 'credentials', 'messages.user']);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order,
        ]);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,delivering,completed',
        ]);

        $order->update(['status' => $validated['status']]);
        $order->user->notify(new \App\Notifications\OrderStatusUpdatedNotification($order, $validated['status']));

        return redirect()->back()->with('success', 'Order status updated.');
    }

    public function updateReceiptStatus(Request $request, PaymentReceipt $paymentReceipt)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
        ]);

        $paymentReceipt->update(['status' => $validated['status']]);

        if ($validated['status'] === 'approved') {
            $paymentReceipt->order->update(['status' => 'delivering']);
            $paymentReceipt->order->user->notify(new \App\Notifications\OrderStatusUpdatedNotification($paymentReceipt->order, 'delivering'));
        }

        return redirect()->back()->with('success', 'Receipt status updated.');
    }

    public function storeCredential(Request $request, Order $order)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $order->credentials()->create([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential added.');
    }

    public function updateCredential(Request $request, Order $order, \App\Models\OrderCredential $credential)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $credential->update([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential updated.');
    }

    public function destroyCredential(Order $order, \App\Models\OrderCredential $credential)
    {
        $credential->delete();

        return redirect()->back()->with('success', 'Digital credential deleted.');
    }

    public function storeMessage(Request $request, Order $order)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $message = $order->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
        ]);

        $message->load('user');
        \App\Events\OrderMessageCreated::dispatch($message);
        $order->user->notify(new \App\Notifications\NewMessageNotification($message));

        return redirect()->back()->with('success', 'Message sent.');
    }

    public function destroy(Order $order)
    {
        $order->delete();
        return redirect()->route('admin.orders.index')->with('success', 'Order deleted successfully.');
    }
}
