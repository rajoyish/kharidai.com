<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CostBasis;
use App\Enums\PriceRounding;
use App\Enums\PurchasePlatform;
use App\Http\Controllers\Concerns\FlashesToasts;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\VariantPriceSnapshot;
use App\Models\WalletPurchase;
use App\Services\Procurement\PriceCalculator;
use App\Services\Procurement\VariantPriceHistory;
use App\Services\Procurement\WalletLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The price calculator and price history for one variant.
 */
class VariantPricingController extends Controller
{
    use FlashesToasts;

    public function __construct(
        private readonly PriceCalculator $calculator,
        private readonly VariantPriceHistory $history,
        private readonly WalletLedger $ledger,
    ) {}

    public function show(Product $product, ProductVariant $variant): Response
    {
        $variant->makeVisible(ProductVariant::PROCUREMENT_FIELDS);
        $lastCalculation = $variant->latestCalculatorSnapshot()->first();

        $suppliers = self::supplierOptions($this->ledger);

        $snapshots = $variant->priceSnapshots()
            ->with(['user:id,name', 'supplier:id,name'])
            ->latest('id')
            ->limit(500)
            ->get()
            ->map(fn (VariantPriceSnapshot $snapshot): array => [
                'id' => $snapshot->id,
                'source' => $snapshot->source->value,
                'source_label' => $snapshot->source->label(),
                'selling_price_npr' => $snapshot->selling_price_npr,
                'purchase_price_npr' => $snapshot->purchase_price_npr,
                'landed_cost_npr' => $snapshot->landed_cost_npr,
                'extra_cost_npr' => $snapshot->extra_cost_npr,
                'cost_npr' => $snapshot->costNpr(),
                'supplier_cost_credits' => $snapshot->supplier_cost_credits,
                'npr_per_credit' => $snapshot->npr_per_credit,
                'cost_basis_label' => $snapshot->cost_basis?->label(),
                'target_profit_npr' => $snapshot->target_profit_npr,
                'target_margin_percent' => $snapshot->target_margin_percent,
                'supplier_name' => $snapshot->supplier?->name,
                'user_name' => $snapshot->user?->name,
                'notes' => $snapshot->notes,
                'recorded_at' => $snapshot->created_at?->toIso8601String(),
            ]);

        $purchases = $variant->walletPurchases()
            ->with(['variant.product:id,title,slug', 'supplier:id,name'])
            ->latest('purchased_at')
            ->latest('id')
            ->limit(200)
            ->get()
            ->map(fn (WalletPurchase $purchase): array => SupplierController::purchaseRow($purchase));

        $currentCost = $this->calculator->currentLandedCost($variant, $lastCalculation?->cost_basis ?? CostBasis::Fifo);

        return Inertia::render('Admin/ProductVariants/Pricing', [
            'product' => $product->only(['id', 'title', 'slug', 'type']),
            'variant' => $variant->only(['id', 'name', 'price_npr', 'purchase_price_npr', 'supplier_id', 'supplier_cost_credits']),
            'suppliers' => $suppliers,
            'platforms' => PurchasePlatform::options(),
            'defaults' => [
                'supplier_id' => $variant->supplier_id ?? $lastCalculation?->supplier_id ?? $suppliers->first()['id'] ?? null,
                'supplier_cost_credits' => $variant->supplier_cost_credits ?? '',
                'cost_basis' => $lastCalculation?->cost_basis->value ?? CostBasis::Fifo->value,
                'manual_npr_per_credit' => $lastCalculation?->cost_basis === CostBasis::Manual ? $lastCalculation->npr_per_credit : '',
                'extra_cost_npr' => $lastCalculation?->extra_cost_npr ?? '',
                'profit_mode' => $lastCalculation?->target_margin_percent !== null ? 'margin' : 'amount',
                'target_profit_npr' => $lastCalculation?->target_profit_npr ?? '',
                'target_margin_percent' => $lastCalculation?->target_margin_percent ?? '',
                'rounding' => $lastCalculation?->rounding->value ?? PriceRounding::NearestRupee->value,
            ],
            'costDrift' => $currentCost === null ? null : [
                'current_cost_npr' => round($currentCost + ($lastCalculation?->extra_cost_npr ?? 0), 2),
                'recorded_cost_npr' => $variant->purchase_price_npr,
            ],
            'snapshots' => $snapshots,
            'purchases' => $purchases,
            ...self::calculatorOptions(),
        ]);
    }

    /**
     * Set who this variant is bought from and its price there in credits,
     * without changing the selling price.
     */
    public function assignSupplier(Request $request, Product $product, ProductVariant $variant): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'supplier_cost_credits' => ['nullable', WalletTopUpController::CREDITS_RULE],
        ], [
            'supplier_id.required' => 'Pick a supplier.',
            'supplier_cost_credits.regex' => 'Enter a number like 2.04 (max 8 decimals).',
        ]);

        $variant->update([
            'supplier_id' => $validated['supplier_id'],
            'supplier_cost_credits' => $validated['supplier_cost_credits'] ?? $variant->supplier_cost_credits,
        ]);

        $this->toast('success', 'Supplier saved.');

        return redirect()->back();
    }

    public function quote(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        return response()->json($this->calculator->quote(self::validateCalculatorInput($request)));
    }

    /**
     * Quote a variant that is still being created, for the calculator on the
     * Create Variant form.
     */
    public function quoteNew(Request $request, Product $product): JsonResponse
    {
        return response()->json($this->calculator->quote(self::validateCalculatorInput($request)));
    }

    public function apply(Request $request, Product $product, ProductVariant $variant): RedirectResponse
    {
        $input = self::validateCalculatorInput($request);
        $input['notes'] = $request->validate(['notes' => 'nullable|string|max:2000'])['notes'] ?? null;

        $applied = $this->history->applyQuote($variant, $input, $request->boolean('update_purchase_price', true), $request->user());

        if ($applied === null) {
            return redirect()->back()->withErrors(['supplier_cost_credits' => 'Add a top-up first, or type your own credit price.']);
        }

        $this->toast('success', sprintf(
            'Price set to Rs. %s (profit Rs. %s).',
            number_format($applied['quote']['selling_price_npr'], 2),
            number_format($applied['quote']['profit_npr'], 2),
        ));

        return redirect()->back();
    }

    /**
     * Every supplier with its wallet's live balance and credit prices, so a
     * calculator can show what is available the moment one is picked.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function supplierOptions(WalletLedger $ledger): Collection
    {
        return Supplier::query()->with('latestTopUp')->orderBy('name')->get()
            ->map(fn (Supplier $supplier): array => SupplierController::summary($supplier, $ledger))
            ->values();
    }

    /**
     * The choices a calculator offers for its credit rate and rounding.
     *
     * @return array{costBases: list<array{value: string, label: string}>, roundings: list<array{value: string, label: string}>}
     */
    public static function calculatorOptions(): array
    {
        return [
            'costBases' => array_map(fn (CostBasis $basis): array => ['value' => $basis->value, 'label' => $basis->label()], CostBasis::cases()),
            'roundings' => array_map(fn (PriceRounding $rounding): array => ['value' => $rounding->value, 'label' => $rounding->label()], PriceRounding::cases()),
        ];
    }

    /**
     * Validate a calculator's inputs.
     *
     * @return array<string, mixed>
     */
    public static function validateCalculatorInput(Request $request): array
    {
        return $request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id', Rule::requiredIf($request->input('cost_basis') !== CostBasis::Manual->value)],
            'supplier_cost_credits' => ['required', WalletTopUpController::CREDITS_RULE, 'not_regex:/^0+(\.0+)?$/'],
            'cost_basis' => ['required', Rule::enum(CostBasis::class)],
            'manual_npr_per_credit' => ['nullable', 'numeric', 'gt:0', 'max:99999999', Rule::requiredIf($request->input('cost_basis') === CostBasis::Manual->value)],
            'extra_cost_npr' => 'nullable|numeric|min:0|max:99999999',
            'profit_mode' => 'required|in:amount,margin',
            'target_profit_npr' => 'nullable|numeric|min:0|max:99999999',
            'target_margin_percent' => 'nullable|numeric|min:0|max:95',
            'rounding' => ['required', Rule::enum(PriceRounding::class)],
            'final_price_npr' => 'nullable|numeric|min:0|max:99999999',
        ], [
            'supplier_cost_credits.regex' => 'Enter a number like 2.04 (max 8 decimals).',
            'supplier_cost_credits.not_regex' => 'Must be more than 0.',
            'manual_npr_per_credit.required' => 'Enter the price of 1 credit in Rs.',
            'supplier_id.required' => 'Pick a supplier.',
        ]);
    }
}
