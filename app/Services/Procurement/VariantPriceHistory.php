<?php

namespace App\Services\Procurement;

use App\Enums\CostBasis;
use App\Enums\PriceRounding;
use App\Enums\PriceSnapshotSource;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\VariantPriceSnapshot;
use Illuminate\Support\Facades\DB;

/**
 * Appends to a variant's price history, and applies calculator prices.
 *
 * History is written explicitly by the two paths that set a price — the
 * variant form and the calculator — rather than by a model observer, so a
 * calculator snapshot carries its full cost inputs instead of being shadowed
 * by a bare "price changed" row written first.
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
     * Re-run the quote on the server, set the variant's price from it, and
     * snapshot the inputs it was set against.
     *
     * The quote is recomputed rather than trusted from the browser, so the
     * recorded cost is the one the wallet actually supports at this moment.
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
            $isManualRate = $input['cost_basis'] === CostBasis::Manual->value;

            $variant->update([
                'price_npr' => $quote['selling_price_npr'],
                'purchase_price_npr' => $updatePurchasePrice ? $quote['total_cost_npr'] : $variant->purchase_price_npr,
                'supplier_id' => $isManualRate ? $variant->supplier_id : $quote['supplier_id'],
                'supplier_cost_credits' => $quote['supplier_cost_credits'],
            ]);

            $snapshot = $variant->priceSnapshots()->create([
                'user_id' => $user?->id,
                'supplier_id' => $isManualRate ? null : $quote['supplier_id'],
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
                'notes' => $input['notes'] ?? null,
            ]);

            return ['variant' => $variant, 'snapshot' => $snapshot, 'quote' => $quote];
        });
    }
}
