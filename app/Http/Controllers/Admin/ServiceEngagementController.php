<?php

namespace App\Http\Controllers\Admin;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\ProductType;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use App\Services\Engagements\EngagementStateMachine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServiceEngagementController extends Controller
{
    public function __construct(private EngagementStateMachine $stateMachine) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        $engagements = ServiceEngagement::query()
            ->with(['user:id,name,email', 'product:id,title', 'productVariant:id,name', 'assignedBy:id,name', 'orderItem.order:id,order_number'])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('project_name', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($user) use ($search) {
                            $user->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('product', fn ($product) => $product->where('title', 'like', "%{$search}%"))
                        ->orWhereHas('orderItem.order', fn ($order) => $order->where('order_number', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->get()
            ->map(fn (ServiceEngagement $engagement): array => [
                'id' => $engagement->id,
                'status' => $engagement->status->value,
                'status_label' => $engagement->status->label(),
                'source' => $engagement->source->value,
                'project_name' => $engagement->project_name,
                'payment_status' => $engagement->paymentStatus(),
                'project_completion_date' => $engagement->project_completion_date?->format('n/j/Y'),
                'total_npr' => (float) ($engagement->agreed_price_npr ?? 0),
                'due_npr' => $engagement->outstandingNpr(),
                'user' => $engagement->user->only('id', 'name', 'email'),
                'product' => $engagement->product?->only('id', 'title'),
                'variant' => $engagement->productVariant?->only('id', 'name'),
                'assigned_by' => $engagement->assignedBy?->name,
                'order' => $engagement->orderItem?->order?->only('id', 'order_number'),
                'created_at' => $engagement->created_at?->format('n/j/Y'),
            ]);

        return Inertia::render('Admin/Services/Index', [
            'engagements' => $engagements,
            'statuses' => EngagementStatus::values(),
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        // Hidden services are intentionally included so admins can assign them.
        $services = Product::query()
            ->ofType(ProductType::Service)
            ->with('variants:id,product_id,name,price_npr')
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'title' => $product->title,
                'variants' => $product->variants->map(fn (ProductVariant $variant): array => [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'price_npr' => $variant->price_npr,
                ]),
            ]);

        return Inertia::render('Admin/Services/Create', [
            'users' => User::orderBy('name')->get(['id', 'name', 'email']),
            'services' => $services,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'product_id' => ['required', Rule::exists('products', 'id')->where('type', ProductType::Service->value)],
            // A package is required so every engagement is billable when an order
            // is later generated from its invoice.
            'product_variant_id' => ['required', Rule::exists('product_variants', 'id')->where('product_id', $request->input('product_id'))],
            'project_name' => ['nullable', 'string', 'max:255'],
            'brief_note' => ['nullable', 'string', 'max:2000'],
            'delivery_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $product = Product::with('serviceDetail')->where('id', $validated['product_id'])->firstOrFail();
        $detail = $product->serviceDetail;

        /** @var ProductVariant $variant */
        $variant = ProductVariant::query()->findOrFail($validated['product_variant_id']);

        // The variant price is a reference estimate only; the real cost is
        // calculated after completion and negotiated.
        $estimateNpr = $variant->price_npr;

        $engagement = ServiceEngagement::create([
            'user_id' => $validated['user_id'],
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'project_name' => $validated['project_name'] ?? null,
            'source' => EngagementSource::Admin,
            'created_by' => $request->user()->id,
            'status' => $detail ? $this->stateMachine->initialStatusFor($detail) : EngagementStatus::InProgress,
            'price_npr' => $estimateNpr,
            'purchase_price_npr' => $variant->purchase_price_npr,
            'pricing_strategy' => $detail?->pricing_strategy,
            'pricing_config' => $detail?->pricing_config,
            'advance_required_npr' => $detail?->advanceAmountNpr($estimateNpr) ?? 0.0,
            'brief' => ! empty($validated['brief_note']) ? ['note' => $validated['brief_note']] : null,
            'delivery_note' => $validated['delivery_note'] ?? null,
        ]);

        return redirect()->route('admin.services.show', $engagement)->with('success', 'Service assigned. Build the invoice brief below.');
    }

    /**
     * The invoice brief generator for a single engagement: current invoice
     * values plus line-item suggestions derived from the snapshotted pricing.
     */
    public function show(ServiceEngagement $serviceEngagement): Response
    {
        $serviceEngagement->load(['user:id,name,email', 'product:id,title', 'productVariant:id,name', 'orderItem.order.paymentReceipt']);

        $linkedOrder = $serviceEngagement->orderItem?->order;

        return Inertia::render('Admin/Services/Show', [
            'engagement' => [
                'id' => $serviceEngagement->id,
                'status' => $serviceEngagement->status->value,
                'status_label' => $serviceEngagement->status->label(),
                'project_name' => $serviceEngagement->project_name,
                'line_items' => $serviceEngagement->line_items ?? [],
                'tax_rate' => (float) $serviceEngagement->tax_rate,
                'advance_paid_npr' => $serviceEngagement->advance_paid_npr,
                'project_completion_date' => $serviceEngagement->project_completion_date?->format('Y-m-d'),
                'subtotal_npr' => $serviceEngagement->subtotalNpr(),
                'tax_npr' => $serviceEngagement->taxNpr(),
                'grand_total_npr' => $serviceEngagement->grandTotalNpr(),
                'due_npr' => $serviceEngagement->outstandingNpr(),
                'payment_status' => $serviceEngagement->paymentStatus(),
                'is_paid' => $serviceEngagement->paymentStatus() === 'paid',
                'invoice_ready' => filled($serviceEngagement->line_items),
                'user' => $serviceEngagement->user->only('id', 'name', 'email'),
                'product' => $serviceEngagement->product?->only('id', 'title'),
                'variant' => $serviceEngagement->productVariant?->only('id', 'name'),
                'brief' => $serviceEngagement->brief,
                'order' => $linkedOrder ? [
                    'id' => $linkedOrder->id,
                    'order_number' => $linkedOrder->order_number,
                    // The customer's uploaded receipt, so payment can be
                    // verified here before toggling the invoice to Paid.
                    'payment_receipt' => $linkedOrder->paymentReceipt?->only('id', 'file_path', 'status'),
                ] : null,
                'advance_required_npr' => (float) $serviceEngagement->advance_required_npr,
            ],
            'lineItemSuggestions' => $serviceEngagement->calculator()->lineItemSuggestions($serviceEngagement->pricing_config ?? []),
            'statusOptions' => $this->statusOptions($serviceEngagement),
        ]);
    }

    /**
     * Every status this engagement may legally move to next, each carrying the
     * business reason it is currently unavailable (or null when it can be taken).
     * The admin UI renders blocked options as disabled with the reason shown.
     *
     * @return list<array{value: string, label: string, blocked_reason: string|null}>
     */
    private function statusOptions(ServiceEngagement $serviceEngagement): array
    {
        return array_map(
            fn (EngagementStatus $status): array => [
                'value' => $status->value,
                'label' => $status->label(),
                'blocked_reason' => $this->stateMachine->blockedReason($serviceEngagement, $status),
            ],
            $serviceEngagement->status->allowedTransitions(),
        );
    }

    /**
     * Generate a payable order from the saved invoice and link this engagement to
     * it, so the customer can view the invoice and settle it from their panel.
     */
    public function assignOrder(ServiceEngagement $serviceEngagement): RedirectResponse
    {
        if ($serviceEngagement->order_item_id !== null) {
            return redirect()->back()->with('error', 'This engagement is already linked to an order.');
        }

        if (blank($serviceEngagement->line_items)) {
            return redirect()->back()->with('error', 'Save the invoice brief before assigning an order.');
        }

        $variantId = $serviceEngagement->product_variant_id
            ?? $serviceEngagement->product?->variants()->value('id');

        if ($variantId === null) {
            return redirect()->back()->with('error', 'This service has no package to bill against. Assign a package to the engagement first.');
        }

        DB::transaction(function () use ($serviceEngagement, $variantId): void {
            $grandTotal = $serviceEngagement->grandTotalNpr();

            $order = Order::create([
                'order_number' => 'ORD-'.strtoupper(Str::random(10)),
                'user_id' => $serviceEngagement->user_id,
                'status' => 'pending',
                'total_amount' => $grandTotal,
                'items_total' => $grandTotal,
                'shipping_total' => 0,
                'amount_due_now' => $serviceEngagement->outstandingNpr(),
                'balance_due' => 0,
            ]);

            $orderItem = $order->items()->create([
                'product_variant_id' => $variantId,
                'price' => $grandTotal,
                'purchase_price' => $serviceEngagement->purchase_price_npr,
                'quantity' => 1,
                'brief' => $serviceEngagement->brief,
            ]);

            $serviceEngagement->update(['order_item_id' => $orderItem->id]);
        });

        return redirect()->back()->with('success', 'Order created and linked. The customer can now pay from their panel.');
    }

    /**
     * Persist the invoice brief: its line items, tax rate and advance drive the
     * subtotal (calculated cost), grand total (agreed price) and due balance.
     */
    public function saveInvoice(Request $request, ServiceEngagement $serviceEngagement): RedirectResponse
    {
        // Rows are validated leniently so a half-finished blank row the admin
        // added but left empty is dropped below rather than rejected outright.
        $validated = $request->validate([
            'project_name' => ['nullable', 'string', 'max:255'],
            'line_items' => ['nullable', 'array'],
            'line_items.*.label' => ['nullable', 'string', 'max:255'],
            'line_items.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'line_items.*.unit_price_npr' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'advance_paid_npr' => ['nullable', 'numeric', 'min:0'],
            'project_completion_date' => ['nullable', 'date'],
        ]);

        /** @var array<int, array<string, mixed>> $rawItems */
        $rawItems = $validated['line_items'] ?? [];

        // Normalise to the stored shape and drop rows without a label.
        $lineItems = collect($rawItems)
            ->map(fn (array $item): array => [
                'label' => trim((string) ($item['label'] ?? '')),
                'quantity' => (float) ($item['quantity'] ?? 0),
                'unit_price_npr' => (float) ($item['unit_price_npr'] ?? 0),
            ])
            ->filter(fn (array $item): bool => $item['label'] !== '')
            ->values()
            ->all();

        $serviceEngagement->fill([
            'project_name' => $validated['project_name'] ?? null,
            'line_items' => $lineItems,
            'tax_rate' => $validated['tax_rate'],
            'advance_paid_npr' => $validated['advance_paid_npr'] ?? 0,
            'project_completion_date' => $validated['project_completion_date'] ?? null,
        ]);

        // Subtotal and grand total derive from the freshly filled line items/tax.
        $serviceEngagement->calculated_cost_npr = $serviceEngagement->subtotalNpr();
        $serviceEngagement->agreed_price_npr = $serviceEngagement->grandTotalNpr();
        $serviceEngagement->save();

        return redirect()->route('admin.services.show', $serviceEngagement)->with('success', 'Invoice brief saved.');
    }

    public function signContract(ServiceEngagement $serviceEngagement): RedirectResponse
    {
        return $this->runTransition(
            fn () => $serviceEngagement->signContract($this->stateMachine),
            'Contract signed.',
        );
    }

    public function recordAdvance(Request $request, ServiceEngagement $serviceEngagement): RedirectResponse
    {
        $validated = $request->validate([
            'amount_npr' => ['required', 'numeric', 'min:0'],
        ]);

        return $this->runTransition(
            fn () => $serviceEngagement->recordAdvance($this->stateMachine, (float) $validated['amount_npr']),
            'Advance payment recorded.',
        );
    }

    public function recordMeasurement(Request $request, ServiceEngagement $serviceEngagement): RedirectResponse
    {
        $measurement = $request->validate($serviceEngagement->calculator()->measurementRules());

        return $this->runTransition(
            fn () => $serviceEngagement->recordMeasurement($this->stateMachine, $measurement),
            'Final cost calculated. Ready for negotiation.',
        );
    }

    public function negotiate(Request $request, ServiceEngagement $serviceEngagement): RedirectResponse
    {
        $validated = $request->validate([
            'agreed_price_npr' => ['required', 'numeric', 'min:0'],
        ]);

        return $this->runTransition(
            fn () => $serviceEngagement->agreeOnPrice($this->stateMachine, (float) $validated['agreed_price_npr']),
            'Final price agreed.',
        );
    }

    public function complete(ServiceEngagement $serviceEngagement): RedirectResponse
    {
        return $this->runTransition(
            fn () => $this->stateMachine->transition($serviceEngagement, EngagementStatus::Completed),
            'Engagement completed.',
        );
    }

    public function updateStatus(Request $request, ServiceEngagement $serviceEngagement): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(EngagementStatus::class)],
        ]);

        return $this->runTransition(
            fn () => $this->stateMachine->transition($serviceEngagement, EngagementStatus::from($validated['status'])),
            'Engagement status updated.',
        );
    }

    /**
     * Manually mark the invoice paid or due, overriding the derived status.
     */
    public function updatePaymentStatus(Request $request, ServiceEngagement $serviceEngagement): RedirectResponse
    {
        $validated = $request->validate([
            'is_paid' => ['required', 'boolean'],
        ]);

        $serviceEngagement->update(['is_paid' => $validated['is_paid']]);

        return redirect()->back()->with('success', $validated['is_paid'] ? 'Marked as paid.' : 'Marked as due.');
    }

    public function destroy(ServiceEngagement $serviceEngagement): RedirectResponse
    {
        $serviceEngagement->delete();

        return redirect()->back()->with('success', 'Engagement removed.');
    }

    /**
     * Run a guarded lifecycle transition, surfacing an illegal move as a flash
     * error rather than a 500.
     */
    private function runTransition(callable $action, string $success): RedirectResponse
    {
        try {
            $action();
        } catch (InvalidEngagementTransitionException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success', $success);
    }
}
