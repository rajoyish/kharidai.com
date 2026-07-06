<?php

namespace App\Http\Controllers\User;

use App\Events\OrderMessageCreated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::with(['items.productVariant.product', 'shipment'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(10);

        return Inertia::render('User/Orders/Index', [
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        $order->load(['items.productVariant.product', 'paymentReceipt', 'credentials', 'messages.user', 'shipment']);

        return Inertia::render('User/Orders/Show', [
            'order' => $order,
        ]);
    }

    public function storeMessage(Request $request, Order $order): RedirectResponse
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
        OrderMessageCreated::dispatch($message);

        $admins = User::where('is_admin', true)->get();
        Notification::send($admins, new NewMessageNotification($message));

        return redirect()->back()->with('success', 'Message sent.');
    }

    public function askForReceiptReupload(Request $request, Order $order): RedirectResponse
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        $order->update(['request_receipt_upload' => true]);

        $message = $order->messages()->create([
            'user_id' => $request->user()->id,
            'message' => 'I would like to request permission to re-upload my payment receipt.',
        ]);

        $message->load('user');
        OrderMessageCreated::dispatch($message);

        $admins = User::where('is_admin', true)->get();
        Notification::send($admins, new NewMessageNotification($message));

        return redirect()->back()->with('success', 'Request sent to admin.');
    }
}
