<?php

use App\Models\CartItem;
use App\Models\PhysicalProductDetail;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use App\Services\Shipping\ShippingCalculator;
use Illuminate\Database\Eloquent\Collection;

/**
 * Build a physical cart item wired to a product with the given detail/price.
 *
 * @param  array<string, mixed>  $detail
 */
function physicalCartItem(float $priceNpr, int $quantity, array $detail): CartItem
{
    $product = Product::factory()->physical()->create();
    PhysicalProductDetail::factory()->create(['product_id' => $product->id, ...$detail]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'price_npr' => $priceNpr,
    ]);

    return CartItem::factory()->create([
        'product_variant_id' => $variant->id,
        'quantity' => $quantity,
    ])->load('productVariant.product.physicalDetail');
}

function zoneWithRate(array $rate = []): ShippingZone
{
    $zone = ShippingZone::factory()->create();
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'base_fee_npr' => 100,
        'per_kg_fee_npr' => 50,
        'free_over_npr' => null,
        ...$rate,
    ]);

    return $zone->load('rate');
}

it('charges base fee plus per-kg fee for weight-based items', function () {
    $zone = zoneWithRate();
    $item = physicalCartItem(1000, 3, ['weight_grams' => 500, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // 3 x 500g = 1500g -> ceil(1.5) = 2kg -> 2*50 = 100, plus base 100 = 200.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(200.0);
});

it('uses the flat shipping override and skips the base fee', function () {
    $zone = zoneWithRate();
    $item = physicalCartItem(6500, 2, ['weight_grams' => 300, 'free_shipping' => false, 'flat_shipping_npr' => 200]);

    // Flat 200 x 2 = 400, no base fee.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(400.0);
});

it('ships free when the product is flagged free shipping', function () {
    $zone = zoneWithRate();
    $item = physicalCartItem(2800, 1, ['weight_grams' => 400, 'free_shipping' => true, 'flat_shipping_npr' => null]);

    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(0.0);
});

it('waives shipping once the free-over threshold is reached', function () {
    $zone = zoneWithRate(['free_over_npr' => 5000]);
    $item = physicalCartItem(6000, 1, ['weight_grams' => 500, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(0.0);
});

it('returns zero when the zone has no rate', function () {
    $zone = ShippingZone::factory()->create()->load('rate');
    $item = physicalCartItem(1000, 1, ['weight_grams' => 500, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(0.0);
});
