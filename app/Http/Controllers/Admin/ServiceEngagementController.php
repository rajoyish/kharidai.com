<?php

namespace App\Http\Controllers\Admin;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\ProductType;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use App\Services\Engagements\EngagementStateMachine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServiceEngagementController extends Controller
{
    public function __construct(private EngagementStateMachine $stateMachine) {}

    public function index(): Response
    {
        $engagements = ServiceEngagement::query()
            ->with(['user:id,name,email', 'product:id,title', 'productVariant:id,name', 'assignedBy:id,name'])
            ->latest()
            ->get()
            ->map(fn (ServiceEngagement $engagement): array => [
                'id' => $engagement->id,
                'status' => $engagement->status->value,
                'status_label' => $engagement->status->label(),
                'source' => $engagement->source->value,
                'price_npr' => $engagement->price_npr,
                'user' => $engagement->user->only('id', 'name', 'email'),
                'product' => $engagement->product?->only('id', 'title'),
                'variant' => $engagement->productVariant?->only('id', 'name'),
                'assigned_by' => $engagement->assignedBy?->name,
                'created_at' => $engagement->created_at?->format('n/j/Y'),
            ]);

        return Inertia::render('Admin/Services/Index', [
            'engagements' => $engagements,
            'statuses' => EngagementStatus::values(),
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
            'statuses' => EngagementStatus::values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'product_id' => ['required', Rule::exists('products', 'id')->where('type', ProductType::Service->value)],
            'product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'brief_note' => ['nullable', 'string', 'max:2000'],
            'delivery_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $product = Product::with('serviceDetail')->where('id', $validated['product_id'])->firstOrFail();
        $detail = $product->serviceDetail;

        $variant = ! empty($validated['product_variant_id'])
            ? ProductVariant::query()->where('id', $validated['product_variant_id'])->first()
            : null;

        // The variant price, if any, is a reference estimate only; the real cost
        // is calculated after completion and negotiated.
        $estimateNpr = $variant->price_npr ?? 0.0;

        ServiceEngagement::create([
            'user_id' => $validated['user_id'],
            'product_id' => $product->id,
            'product_variant_id' => $validated['product_variant_id'] ?? null,
            'source' => EngagementSource::Admin,
            'created_by' => $request->user()->id,
            'status' => $detail ? $this->stateMachine->initialStatusFor($detail) : EngagementStatus::InProgress,
            'price_npr' => $estimateNpr,
            'purchase_price_npr' => $variant->purchase_price_npr ?? 0.0,
            'pricing_strategy' => $detail?->pricing_strategy,
            'pricing_config' => $detail?->pricing_config,
            'advance_required_npr' => $detail?->advanceAmountNpr($estimateNpr) ?? 0.0,
            'brief' => ! empty($validated['brief_note']) ? ['note' => $validated['brief_note']] : null,
            'delivery_note' => $validated['delivery_note'] ?? null,
        ]);

        return redirect()->route('admin.services.index')->with('success', 'Service assigned to user.');
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
