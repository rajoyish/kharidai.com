<?php

namespace App\Http\Controllers\Admin;

use App\Events\OrderMessageCreated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderCredential;
use App\Models\PaymentReceipt;
use App\Models\Shipment;
use App\Notifications\NewMessageNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $baseQuery = Order::with(['user', 'paymentReceipt', 'items.productVariant.product'])->latest();

        $digitalOrders = (clone $baseQuery)->whereHas('items.productVariant.product', function ($q) {
            $q->where('type', 'digital');
        })->paginate(10, ['*'], 'digital_page')->withQueryString();

        $physicalOrders = (clone $baseQuery)->whereHas('items.productVariant.product', function ($q) {
            $q->where('type', 'physical');
        })->paginate(10, ['*'], 'physical_page')->withQueryString();

        $serviceOrders = (clone $baseQuery)->whereHas('items.productVariant.product', function ($q) {
            $q->where('type', 'service');
        })->paginate(10, ['*'], 'service_page')->withQueryString();

        return Inertia::render('Admin/Orders/Index', [
            'digitalOrders' => $digitalOrders,
            'physicalOrders' => $physicalOrders,
            'serviceOrders' => $serviceOrders,
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load(['items.productVariant.product', 'items.serviceEngagements', 'user', 'paymentReceipt', 'credentials', 'messages.user', 'subscriptions.orderItem.productVariant.product', 'shipment', 'shippingAddress']);

        $order->items->each(function ($item): void {
            $item->setAttribute('service_invoices', $item->serviceEngagements
                ->filter(fn ($engagement): bool => filled($engagement->line_items))
                ->map(fn ($engagement): array => [
                    'id' => $engagement->id,
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
                ->values()->all());
        });

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order,
            'shipmentStatuses' => Shipment::STATUSES,
        ]);
    }

    public function updateShipmentStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Shipment::STATUSES)],
        ]);

        $shipment = $order->shipment;

        if ($shipment === null) {
            return redirect()->back()->with('error', 'This order has no shipment to update.');
        }

        $shipment->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Shipment status updated.');
    }

    public function markBalancePaid(Order $order): RedirectResponse
    {
        $order->update(['balance_due' => 0]);

        return redirect()->back()->with('success', 'Balance marked as paid.');
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,delivering,completed',
        ]);

        $previousStatus = $order->status;

        $order->update(['status' => $validated['status']]);

        if ($validated['status'] === 'completed' && $previousStatus !== 'completed') {
            $this->createSubscriptionsForCompletedItems($order);
        }

        $order->user->notify(new OrderStatusUpdatedNotification($order, $validated['status']));

        return redirect()->back()->with('success', 'Order status updated.');
    }

    public function updateReceiptStatus(Request $request, PaymentReceipt $paymentReceipt): RedirectResponse
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

    public function storeCredential(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $order->credentials()->create([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential added.');
    }

    public function updateCredential(Request $request, Order $order, OrderCredential $credential): RedirectResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $credential->update([
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', 'Digital credential updated.');
    }

    public function destroyCredential(Order $order, OrderCredential $credential): RedirectResponse
    {
        $credential->delete();

        return redirect()->back()->with('success', 'Digital credential deleted.');
    }

    public function storeMessage(Request $request, Order $order): RedirectResponse
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

    public function destroy(Order $order): RedirectResponse
    {
        $receiptPath = $order->paymentReceipt?->file_path;

        $order->delete();

        if ($receiptPath !== null) {
            Storage::disk('public')->delete($receiptPath);
        }

        return redirect()->route('admin.orders.index')->with('success', 'Order deleted successfully.');
    }

    public function allowReceiptReupload(Request $request, Order $order): RedirectResponse
    {
        $order->update([
            'can_reupload_receipt' => true,
            'request_receipt_upload' => false,
        ]);

        return redirect()->back()->with('success', 'User can now re-upload receipt.');
    }

    private function createSubscriptionsForCompletedItems(Order $order): void
    {
        $order->loadMissing(['items.productVariant', 'items.subscriptions']);

        foreach ($order->items as $item) {
            $validityDays = $item->productVariant->validity_days;

            if ($validityDays === null) {
                continue;
            }

            $startDate = today();
            $endDate = $startDate->copy()->addDays($validityDays);
            $missingSubscriptions = max($item->quantity - $item->subscriptions->count(), 0);

            if ($missingSubscriptions === 0) {
                continue;
            }

            $subscriptionAttributes = [
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ];

            $item->subscriptions()->createMany(
                array_fill(0, $missingSubscriptions, $subscriptionAttributes),
            );
        }
    }
}
