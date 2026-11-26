<?php

namespace App\Services\Procurement;

use App\Enums\CostBasis;
use App\Enums\PriceRounding;
use App\Enums\PriceSnapshotSource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\VariantPriceSnapshot;
use Illuminate\Support\Facades\DB;

/**
 * Appends to a variant's price history, and applies calculator prices.
 *
 * History is written explicitly by the paths that set a price — the variant
 * form and the calculator, including a variant created through it — rather
 * than by a model observer, so a calculator snapshot carries its full cost
 * inputs instead of being shadowed by a bare "price changed" row written first.
 */
class VariantPriceHistory
{
    public function __construct(private readonly PriceCalculator $calculator) {}

    /**
     * Record a price typed into the variant form, if it actually changed.
     */
    public function recordManualChange(ProductVariant $variant, ?User $user): ?VariantPriceSnapshot
    {
        if (! $variant->wasRecentlyCreated && ! $variant->wasChanged(['price_npr', 'purchase_price_npr'])) {
            return null;
        }

        return $variant->priceSnapshots()->create([
            'user_id' => $user?->id,
            'supplier_id' => $variant->supplier_id,
            'source' => PriceSnapshotSource::Manual,
            'selling_price_npr' => $variant->price_npr,
            'purchase_price_npr' => $variant->purchase_price_npr,
        ]);
    }

    /**
     * Create a variant priced by the calculator, so its history starts with
     * the cost inputs behind its first price instead of a placeholder.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array<string, mixed>  $input
     * @return array{variant: ProductVariant, snapshot: VariantPriceSnapshot, quote: array<string, mixed>}|null
     */
    public function createFromQuote(Product $product, array $attributes, array $input, ?User $user): ?array
    {
        $quote = $this->calculator->quote($input);

        if ($quote['selling_price_npr'] === null || $quote['total_cost_npr'] === null) {
            return null;
        }

        return DB::transaction(function () use ($product, $attributes, $input, $quote, $user): array {
            $variant = $product->variants()->create([
                ...$attributes,
                'price_npr' => $quote['selling_price_npr'],
                'purchase_price_npr' => $quote['total_cost_npr'],
                'supplier_id' => $this->isManualRate($input) ? null : $quote['supplier_id'],
                'supplier_cost_credits' => $quote['supplier_cost_credits'],
            ]);

            return ['variant' => $variant, 'snapshot' => $this->snapshotQuote($variant, $input, $quote, $user), 'quote' => $quote];
        });
    }

    /**
     * Re-run the quote on the server, set the variant's price from it, and
     * snapshot the inputs it was set against.
     *
     * The quote is recomputed rather than trusted from the browser, so the
     * recorded cost is the one the wallet actually supports at this moment.
     * Applying the same quote again changes nothing, so it adds no history row.
     *
     * @param  array<string, mixed>  $input
     * @return array{variant: ProductVariant, snapshot: VariantPriceSnapshot, quote: array<string, mixed>}|null
     */
    public function applyQuote(ProductVariant $variant, array $input, bool $updatePurchasePrice, ?User $user): ?array
    {
        $quote = $this->calculator->quote($input);

        if ($quote['selling_price_npr'] === null || $quote['total_cost_npr'] === null) {
            return null;
        }

        return DB::transaction(function () use ($variant, $input, $quote, $updatePurchasePrice, $user): array {
            $variant->update([
                'price_npr' => $quote['selling_price_npr'],
                'purchase_price_npr' => $updatePurchasePrice ? $quote['total_cost_npr'] : $variant->purchase_price_npr,
                'supplier_id' => $this->isManualRate($input) ? $variant->supplier_id : $quote['supplier_id'],
                'supplier_cost_credits' => $quote['supplier_cost_credits'],
            ]);

            $snapshot = $this->repeatedSnapshot($variant, $input, $quote)
                ?? $this->snapshotQuote($variant, $input, $quote, $user);

            return ['variant' => $variant, 'snapshot' => $snapshot, 'quote' => $quote];
        });
    }

    /**
     * What a snapshot records about the price itself. Two snapshots that agree
     * on these describe the same price, however it was reached.
     */
    private const OUTCOME_ATTRIBUTES = [
        'supplier_id',
        'source',
        'selling_price_npr',
        'purchase_price_npr',
        'landed_cost_npr',
        'supplier_cost_credits',
        'npr_per_credit',
        'cost_basis',
        'extra_cost_npr',
    ];

    /**
     * The latest snapshot, when it already records this price and the variant
     * did not move, so applying again adds no history row.
     *
     * Compared on the outcome only. Profit target and rounding are how the
     * admin arrived at a price, and the calculator reopens with a target
     * derived from the live price, so the same price is often reached through
     * a different target. Counting those as changes wrote a duplicate row for
     * every click on an unchanged Apply.
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $quote
     */
    private function repeatedSnapshot(ProductVariant $variant, array $input, array $quote): ?VariantPriceSnapshot
    {
        if (filled($input['notes'] ?? null) || $variant->wasChanged(['price_npr', 'purchase_price_npr'])) {
            return null;
        }

        $latest = $variant->priceSnapshots()->latest('id')->first();

        if ($latest === null) {
            return null;
        }

        $candidate = (new VariantPriceSnapshot)->forceFill($this->snapshotAttributes($variant, $input, $quote));

        foreach (self::OUTCOME_ATTRIBUTES as $attribute) {
            if ($latest->getAttribute($attribute) != $candidate->getAttribute($attribute)) {
                return null;
            }
        }

        return $latest;
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $quote
     */
    private function snapshotQuote(ProductVariant $variant, array $input, array $quote, ?User $user): VariantPriceSnapshot
    {
        return $variant->priceSnapshots()->create([
            ...$this->snapshotAttributes($variant, $input, $quote),
            'user_id' => $user?->id,
            'notes' => $input['notes'] ?? null,
        ]);
    }

    /**
     * What a calculator snapshot records about a quote, apart from who applied
     * it and why.
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $quote
     * @return array<string, mixed>
     */
    private function snapshotAttributes(ProductVariant $variant, array $input, array $quote): array
    {
        return [
            // A typed rate is still bought from the variant's supplier, so the
            // row names it rather than leaving the history unattributed.
            'supplier_id' => $this->isManualRate($input) ? $variant->supplier_id : $quote['supplier_id'],
            'source' => PriceSnapshotSource::Calculator,
            'selling_price_npr' => $quote['selling_price_npr'],
            'purchase_price_npr' => $variant->purchase_price_npr,
            'landed_cost_npr' => $quote['landed_cost_npr'],
            'supplier_cost_credits' => $quote['supplier_cost_credits'],
            'npr_per_credit' => $quote['npr_per_credit'] === null ? null : round($quote['npr_per_credit'], 6),
            'cost_basis' => $input['cost_basis'],
            'target_profit_npr' => $input['profit_mode'] === 'amount' ? (float) ($input['target_profit_npr'] ?? 0) : null,
            'target_margin_percent' => $input['profit_mode'] === 'margin' ? (float) ($input['target_margin_percent'] ?? 0) : null,
            'extra_cost_npr' => $quote['extra_cost_npr'] ?: null,
            'rounding' => PriceRounding::from($input['rounding']),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function isManualRate(array $input): bool
    {
        return $input['cost_basis'] === CostBasis::Manual->value;
    }
}
