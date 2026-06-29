<?php

namespace App\Http\Controllers\Admin;

use App\Events\OrderMessageCreated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderCredential;
use App\Models\PaymentReceipt;
use App\Notifications\NewMessageNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
        $order->user->notify(new OrderStatusUpdatedNotification($order, $validated['status']));

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
            $paymentReceipt->order->user->notify(new OrderStatusUpdatedNotification($paymentReceipt->order, 'delivering'));
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

    public function updateCredential(Request $request, Order $order, OrderCredential $credential)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $credential->update([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential updated.');
    }

    public function destroyCredential(Order $order, OrderCredential $credential)
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
        OrderMessageCreated::dispatch($message);
        $order->user->notify(new NewMessageNotification($message));

        return redirect()->back()->with('success', 'Message sent.');
    }

    public function destroy(Order $order)
    {
        $receiptPath = $order->paymentReceipt?->file_path;

        $order->delete();

        if ($receiptPath !== null) {
            Storage::disk('public')->delete($receiptPath);
        }

        return redirect()->route('admin.orders.index')->with('success', 'Order deleted successfully.');
    }

    public function allowReceiptReupload(Request $request, Order $order)
    {
        $order->update([
            'can_reupload_receipt' => true,
            'request_receipt_upload' => false,
        ]);

        return redirect()->back()->with('success', 'User can now re-upload receipt.');
    }
}
