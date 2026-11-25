<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CostBasis;
use App\Enums\PriceRounding;
use App\Enums\PriceSnapshotSource;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\VariantPriceSnapshot;
use App\Services\Procurement\PriceCalculator;
use App\Services\Procurement\VariantPriceHistory;
use App\Services\Procurement\WalletLedger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductVariantController extends Controller
{
    /** The Create form prices the new variant with the calculator. */
    public const PRICED_BY_CALCULATOR = 'calculator';

    /** The Create form takes a selling price typed in by hand. */
    public const PRICED_BY_HAND = 'manual';

    public function __construct(private readonly VariantPriceHistory $priceHistory) {}

    public function index(Product $product, PriceCalculator $calculator): Response
    {
        $variants = $product->variants()
            ->with(['supplier', 'latestCalculatorSnapshot'])
            ->latest()
            ->get();

        return Inertia::render('Admin/ProductVariants/Index', [
            'product' => $product,
            // Admins are the only audience allowed to see wholesale cost, which
            // the model hides from serialization by default.
            'variants' => $variants->map(fn (ProductVariant $variant): array => [
                ...$variant->makeVisible(ProductVariant::PROCUREMENT_FIELDS)
                    ->makeHidden(['supplier', 'latestCalculatorSnapshot'])
                    ->toArray(),
                'supplier_name' => $variant->supplier?->name,
                // What the variant's supplier cost lands at today, so a price set
                // against cheaper credits shows up before it erodes the margin.
                'current_cost_npr' => ($cost = $calculator->currentLandedCost(
                    $variant,
                    $variant->latestCalculatorSnapshot?->cost_basis ?? CostBasis::Fifo,
                )) === null ? null : round($cost + ($variant->latestCalculatorSnapshot?->extra_cost_npr ?? 0), 2),
            ]),
        ]);
    }

    public function create(Product $product, WalletLedger $ledger): Response
    {
        $suppliers = VariantPricingController::supplierOptions($ledger);

        // A new variant is usually bought the same way as its siblings, so the
        // calculator starts from the product's most recent calculation.
        $lastCalculation = VariantPriceSnapshot::query()
            ->whereIn('product_variant_id', $product->variants()->select('id'))
            ->where('source', PriceSnapshotSource::Calculator)
            ->latest('id')
            ->first();

        return Inertia::render('Admin/ProductVariants/Create', [
            'product' => $product,
            'suppliers' => $suppliers,
            'defaults' => [
                'supplier_id' => $lastCalculation?->supplier_id ?? $suppliers->first()['id'] ?? null,
                'cost_basis' => $suppliers->isEmpty() ? CostBasis::Manual->value : ($lastCalculation?->cost_basis->value ?? CostBasis::Fifo->value),
                'manual_npr_per_credit' => $lastCalculation?->cost_basis === CostBasis::Manual ? $lastCalculation->npr_per_credit : '',
                'extra_cost_npr' => $lastCalculation?->extra_cost_npr ?? '',
                'profit_mode' => $lastCalculation?->target_margin_percent !== null ? 'margin' : 'amount',
                'target_profit_npr' => $lastCalculation?->target_profit_npr ?? '',
                'target_margin_percent' => $lastCalculation?->target_margin_percent ?? '',
                'rounding' => $lastCalculation?->rounding->value ?? PriceRounding::NearestRupee->value,
            ],
            ...VariantPricingController::calculatorOptions(),
        ]);
    }

    /**
     * Create a variant priced either by the calculator, which records its
     * cost inputs as the first history row, or by a price typed by hand.
     */
    public function store(Request $request, Product $product): RedirectResponse
    {
        $pricedBy = $request->validate([
            'pricing_mode' => ['nullable', Rule::in([self::PRICED_BY_CALCULATOR, self::PRICED_BY_HAND])],
        ])['pricing_mode'] ?? self::PRICED_BY_HAND;

        if ($pricedBy === self::PRICED_BY_HAND) {
            $variant = $product->variants()->create($this->validatedData($request));
            $this->priceHistory->recordManualChange($variant, $request->user());

            return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant created successfully.');
        }

        $attributes = Arr::except($this->validatedData($request, requiresPrice: false), ['price_npr', 'purchase_price_npr']);
        $input = VariantPricingController::validateCalculatorInput($request);

        if ($this->priceHistory->createFromQuote($product, $attributes, $input, $request->user()) === null) {
            return redirect()->back()->withInput()->withErrors(['supplier_cost_credits' => 'Add a top-up first, or type your own credit price.']);
        }

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant created successfully.');
    }

    public function edit(Product $product, ProductVariant $variant): Response
    {
        return Inertia::render('Admin/ProductVariants/Edit', [
            'product' => $product,
            'variant' => $variant->makeVisible(ProductVariant::PROCUREMENT_FIELDS),
        ]);
    }

    public function update(Request $request, Product $product, ProductVariant $variant): RedirectResponse
    {
        $variant->update($this->validatedData($request));
        $this->priceHistory->recordManualChange($variant, $request->user());

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant updated successfully.');
    }

    /**
     * Validate and normalize the variant payload. A variant carries one
     * shipping weight; color and size are option lists trimmed of blanks.
     *
     * @return array<string, mixed>
     */
    protected function validatedData(Request $request, bool $requiresPrice = true): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'details' => 'nullable|string',
            'price_npr' => [$requiresPrice ? 'required' : 'nullable', 'numeric', 'min:0'],
            'purchase_price_npr' => 'nullable|numeric|min:0',
            'show_pricing' => 'nullable|boolean',
            'validity_days' => 'nullable|integer|min:1',
            'colors' => 'nullable|array',
            'colors.*' => 'nullable|string|max:255',
            'sizes' => 'nullable|array',
            'sizes.*' => 'nullable|string|max:255',
            'weight_kg' => 'nullable|numeric|min:0',
            'ships_individually' => 'nullable|boolean',
            'advance_payment_percent' => 'nullable|integer|min:0|max:100',
        ]);

        $validated['colors'] = array_values(array_filter(
            array_map('trim', $validated['colors'] ?? []),
            fn (string $color): bool => $color !== '',
        ));
        $validated['sizes'] = array_values(array_filter(
            array_map('trim', $validated['sizes'] ?? []),
            fn (string $size): bool => $size !== '',
        ));

        return $validated;
    }

    public function destroy(Product $product, ProductVariant $variant): RedirectResponse
    {
        $variant->delete();

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant deleted successfully.');
    }
}
