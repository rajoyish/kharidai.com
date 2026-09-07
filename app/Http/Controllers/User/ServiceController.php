<?php

namespace App\Http\Controllers\User;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Http\Controllers\Controller;
use App\Models\ServiceEngagement;
use App\Services\Engagements\EngagementStateMachine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    /**
     * Admin-assigned engagements are internal records for offline service work,
     * so the customer only sees the ones that came from their own orders.
     */
    public function index(Request $request): Response
    {
        $engagements = $request->user()
            ->serviceEngagements()
            ->customerVisible()
            ->with(['product:id,title', 'productVariant:id,name', 'orderItem.order:id,order_number'])
            ->latest()
            ->get()
            ->map(fn (ServiceEngagement $engagement): array => [
                'id' => $engagement->id,
                'status' => $engagement->status->value,
                'status_label' => $engagement->status->label(),
                'payment_status' => $engagement->paymentStatus(),
                'project_name' => $engagement->project_name,
                'total_npr' => $engagement->grandTotalNpr(),
                'due_npr' => $engagement->outstandingNpr(),
                'project_completion_date' => $engagement->project_completion_date?->format('n/j/Y'),
                'product' => $engagement->product?->only('id', 'title'),
                'variant' => $engagement->productVariant?->only('id', 'name'),
                'order_id' => $engagement->orderItem?->order?->id,
                'order_number' => $engagement->orderItem?->order?->order_number,
                'delivery_note' => $engagement->delivery_note,
                'created_at' => $engagement->created_at?->format('n/j/Y'),
            ]);

        return Inertia::render('User/Services/Index', [
            'engagements' => $engagements,
        ]);
    }

    /**
     * The customer accepts the generated invoice, moving the engagement to
     * Awaiting payment so the QR payment and receipt upload step opens up.
     *
     * An admin-assigned engagement is off limits here for the same reason it is
     * hidden from the index: the customer never sees its invoice, so agreeing to
     * one by id would advance a record they are not party to.
     */
    public function agreeInvoice(Request $request, ServiceEngagement $serviceEngagement, EngagementStateMachine $stateMachine): RedirectResponse
    {
        if ($serviceEngagement->user_id !== $request->user()->id || $serviceEngagement->source !== EngagementSource::Storefront) {
            abort(403);
        }

        try {
            $stateMachine->transition($serviceEngagement, EngagementStatus::AwaitingPayment);
        } catch (InvalidEngagementTransitionException) {
            return redirect()->back()->with('error', 'This invoice cannot be agreed to right now.');
        }

        return redirect()->back()->with('success', 'Invoice agreed. Scan the QR code to pay, then upload your payment receipt.');
    }
}
