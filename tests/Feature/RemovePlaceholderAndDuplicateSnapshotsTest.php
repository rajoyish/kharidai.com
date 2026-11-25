<?php

use App\Enums\PriceSnapshotSource;
use App\Models\ProductVariant;
use App\Models\VariantPriceSnapshot;

/**
 * @param  array<string, mixed>  $overrides
 */
function calculatorSnapshot(ProductVariant $variant, array $overrides = []): VariantPriceSnapshot
{
    return VariantPriceSnapshot::factory()->for($variant, 'variant')->create([
        'source' => PriceSnapshotSource::Calculator,
        'selling_price_npr' => 499,
        'purchase_price_npr' => 73.59,
        'landed_cost_npr' => 73.59,
        'supplier_cost_credits' => '0.5',
        'npr_per_credit' => '147.17',
        'cost_basis' => 'manual',
        'target_profit_npr' => 0,
        'rounding' => 'nearest_1',
        ...$overrides,
    ]);
}

function runSnapshotCleanup(): void
{
    (require database_path('migrations/2026_11_25_161136_remove_placeholder_and_duplicate_variant_price_snapshots.php'))->up();
}

it('removes a creation placeholder and a repeated calculator row', function () {
    $variant = ProductVariant::factory()->create();
    $placeholder = VariantPriceSnapshot::factory()->for($variant, 'variant')->create(['selling_price_npr' => 1, 'purchase_price_npr' => 1]);
    $applied = calculatorSnapshot($variant);
    $repeat = calculatorSnapshot($variant);

    runSnapshotCleanup();

    expect(VariantPriceSnapshot::pluck('id')->all())->toBe([$applied->id])
        ->and(VariantPriceSnapshot::find($placeholder->id))->toBeNull()
        ->and(VariantPriceSnapshot::find($repeat->id))->toBeNull();
});

it('keeps real price changes, noted rows and a lone first row', function () {
    $variant = ProductVariant::factory()->create();
    $first = calculatorSnapshot($variant);
    $noted = calculatorSnapshot($variant, ['notes' => 'Re-applied after top-up']);
    $changed = calculatorSnapshot($variant, ['selling_price_npr' => 549]);
    $backAgain = calculatorSnapshot($variant);

    $loneVariant = ProductVariant::factory()->create();
    $lone = VariantPriceSnapshot::factory()->for($loneVariant, 'variant')->create(['selling_price_npr' => 1]);

    runSnapshotCleanup();

    expect(VariantPriceSnapshot::orderBy('id')->pluck('id')->all())
        ->toBe([$first->id, $noted->id, $changed->id, $backAgain->id, $lone->id]);
});
