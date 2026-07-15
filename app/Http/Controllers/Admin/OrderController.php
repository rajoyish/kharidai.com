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
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
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
        $years = $this->yearsWithOrders();
        $selectedYear = $this->selectedYear($request, $years);
        $search = $request->string('search')->trim()->value();

        // items.serviceEngagements feeds the appended `profit` attribute, which is
        // serialized for every order below; without it each order lazy-loads.
        $baseQuery = Order::with(['user', 'paymentReceipt', 'items.productVariant.product', 'items.serviceEngagements'])
            ->whereYear('created_at', $selectedYear)
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest();

        // A single year's orders are a bounded set, so the whole year is sent and the
        // page sorts each column client-side. This keeps the computed `profit` column
        // sortable, which a SQL sort could not offer.
        $ordersOfType = fn (string $type) => (clone $baseQuery)
            ->whereHas('items.productVariant.product', fn ($query) => $query->where('type', $type))
            ->get();

        return Inertia::render('Admin/Orders/Index', [
            'digitalOrders' => $ordersOfType('digital'),
            'physicalOrders' => $ordersOfType('physical'),
            'serviceOrders' => $ordersOfType('service'),
            'years' => $years,
            'filters' => [
                'year' => $selectedYear,
                'search' => $search,
            ],
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load(['items.productVariant.product', 'items.serviceEngagements', 'user', 'paymentReceipt', 'credentials', 'messages.user', 'subscriptions.orderItem.productVariant.product', 'shipment', 'shippingAddress']);

        // Engagements without a saved invoice are still listed so the lifecycle
        // status stays visible while the brief is being prepared.
        $order->items->each(function ($item): void {
            $item->setAttribute('service_invoices', $item->serviceEngagements
                ->map(fn ($engagement): array => [
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
                ->values()->all());

            $item->makeHidden('serviceEngagements');
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

    /**
     * Every year that holds an order, newest first. The current year is always
     * offered too, so a year without orders yet is still selectable.
     *
     * @return list<int>
     */
    private function yearsWithOrders(): array
    {
        $years = Order::query()
            ->whereNotNull('created_at')
            ->pluck('created_at')
            ->map(fn (CarbonInterface $createdAt): int => $createdAt->year)
            ->push((int) CarbonImmutable::now()->year)
            ->unique()
            ->sortDesc()
            ->all();

        return array_values($years);
    }

    /**
     * @param  list<int>  $years
     */
    private function selectedYear(Request $request, array $years): int
    {
        $requestedYear = $request->integer('year');

        return in_array($requestedYear, $years, true)
            ? $requestedYear
            : (int) CarbonImmutable::now()->year;
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
