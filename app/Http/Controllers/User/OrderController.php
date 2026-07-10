<?php

namespace App\Http\Controllers\User;

use App\Events\OrderMessageCreated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ServiceEngagement;
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
        $orders = Order::with(['items.productVariant.product', 'items.serviceEngagements', 'shipment'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(10);

        // Service invoices supersede the checkout-time estimates, so the total
        // shown in the Amount column is derived rather than the stored figure.
        // The engagements themselves are only loaded to compute it, so they are
        // hidden rather than shipped to the browser.
        $orders->getCollection()->each(function (Order $order): void {
            $order->setAttribute('display_total_npr', $order->displayTotalNpr());

            $order->items->each(fn (OrderItem $item) => $item->makeHidden('serviceEngagements'));
        });

        return Inertia::render('User/Orders/Index', [
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        $order->load(['items.productVariant.product', 'items.serviceEngagements', 'paymentReceipt', 'credentials', 'messages.user', 'shipment']);

        // Surface the invoice the admin generated for each service engagement so
        // the customer sees the same line items, totals and payment status shown
        // on the admin's invoice brief page. Engagements without a saved invoice
        // are listed too, so the customer can follow the lifecycle status
        // ("In progress", "Final billing", ...) before any billing exists.
        $order->items->each(function (OrderItem $item): void {
            $item->setAttribute('service_invoices', $item->serviceEngagements
                ->map(fn (ServiceEngagement $engagement): array => [
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
                ->values());

            $item->makeHidden('serviceEngagements');
        });

        // The Summary panel shows the invoice-aware total, not the stored
        // checkout-time figure, so service orders don't read as Rs. 0.
        $order->setAttribute('display_total_npr', $order->displayTotalNpr());

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
