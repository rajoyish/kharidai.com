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

it('charges the base fee plus per-kg fee per package', function () {
    $zone = zoneWithRate();
    $item = physicalCartItem(1000, 3, ['weight_kg' => 0.5, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // Each package: base 100 + ceil(0.5)=1kg * 50 = 150. 3 packages -> 450.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(450.0);
});

it('combines light items into a single parcel up to the zone capacity', function () {
    $zone = zoneWithRate(['parcel_capacity_kg' => 5]);
    // 10 units x 0.2kg = 2kg, well under the 5kg cap -> one parcel.
    $item = physicalCartItem(500, 10, ['weight_kg' => 0.2, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // One parcel: base 100 + ceil(2)=2kg * 50 = 200.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(200.0);
});

it('splits combined items into multiple parcels when the weight exceeds capacity', function () {
    $zone = zoneWithRate(['parcel_capacity_kg' => 5]);
    // 30 units x 0.2kg = 6kg -> ceil(6/5) = 2 parcels.
    $item = physicalCartItem(500, 30, ['weight_kg' => 0.2, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // 2 parcels * base 100 + ceil(6)=6kg * 50 = 200 + 300 = 500.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(500.0);
});

it('never combines a variant flagged to ship individually, even under a capacity', function () {
    $zone = zoneWithRate(['parcel_capacity_kg' => 5]);

    $product = Product::factory()->physical()->create();
    PhysicalProductDetail::factory()->create([
        'product_id' => $product->id,
        'weight_kg' => 1.82,
        'free_shipping' => false,
        'flat_shipping_npr' => null,
    ]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'price_npr' => 1000,
        'weight_kg' => 1.82,
        'ships_individually' => true,
    ]);
    $item = CartItem::factory()->create([
        'product_variant_id' => $variant->id,
        'quantity' => 2,
    ])->load('productVariant.product.physicalDetail');

    // Per unit: base 100 + ceil(1.82)=2kg * 50 = 200. 2 units -> 400.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(400.0);
});

it('bills bulky and combinable items separately in the same order', function () {
    $zone = zoneWithRate(['parcel_capacity_kg' => 5]);

    $bulkyProduct = Product::factory()->physical()->create();
    PhysicalProductDetail::factory()->create([
        'product_id' => $bulkyProduct->id,
        'weight_kg' => 1.82,
        'free_shipping' => false,
        'flat_shipping_npr' => null,
    ]);
    $bulkyVariant = ProductVariant::factory()->create([
        'product_id' => $bulkyProduct->id,
        'price_npr' => 1000,
        'weight_kg' => 1.82,
        'ships_individually' => true,
    ]);
    $bulky = CartItem::factory()->create([
        'product_variant_id' => $bulkyVariant->id,
        'quantity' => 2,
    ])->load('productVariant.product.physicalDetail');

    // 10 light units x 0.2kg = 2kg -> one parcel = 200.
    $light = physicalCartItem(500, 10, ['weight_kg' => 0.2, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // Bulky: 2 * (100 + 2*50) = 400. Combinable: 200. Total 600.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$bulky, $light]));

    expect($fee)->toBe(600.0);
});

it('sums the shipping fee per item, charging the base fee for each weight-based product', function () {
    $zone = zoneWithRate();
    $light = physicalCartItem(1000, 1, ['weight_kg' => 0.5, 'free_shipping' => false, 'flat_shipping_npr' => null]);
    $heavy = physicalCartItem(1000, 1, ['weight_kg' => 2, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // Light: base 100 + ceil(0.5)=1kg * 50 = 150. Heavy: base 100 + 2kg * 50 = 200. Total 350.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$light, $heavy]));

    expect($fee)->toBe(350.0);
});

it('aggregates flat and free-shipping items alongside weight-based ones', function () {
    $zone = zoneWithRate();
    $weight = physicalCartItem(1000, 1, ['weight_kg' => 0.5, 'free_shipping' => false, 'flat_shipping_npr' => null]);
    $flat = physicalCartItem(1000, 2, ['weight_kg' => 0.3, 'free_shipping' => false, 'flat_shipping_npr' => 200]);
    $free = physicalCartItem(1000, 1, ['weight_kg' => 0.4, 'free_shipping' => true, 'flat_shipping_npr' => null]);

    // Weight: base 100 + 50 = 150. Flat: 200 * 2 = 400. Free: 0. Total 550.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$weight, $flat, $free]));

    expect($fee)->toBe(550.0);
});

it('bills the exact variant weight, overriding the product weight', function () {
    $zone = zoneWithRate();

    $product = Product::factory()->physical()->create();
    PhysicalProductDetail::factory()->create([
        'product_id' => $product->id,
        'weight_kg' => 0.1,
        'free_shipping' => false,
        'flat_shipping_npr' => null,
    ]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'price_npr' => 1000,
        'weight_kg' => 1.5,
    ]);
    $item = CartItem::factory()->create([
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ])->load('productVariant.product.physicalDetail');

    // Variant 1.5kg -> ceil(1.5) = 2kg -> 2*50 = 100, plus base 100 = 200.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(200.0);
});

it('falls back to the product weight when the variant has no weight', function () {
    $zone = zoneWithRate();
    // Variant created without a weight -> uses physicalDetail weight_kg.
    $item = physicalCartItem(1000, 3, ['weight_kg' => 0.5, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    // Each package: base 100 + ceil(0.5)=1kg * 50 = 150. 3 packages -> 450.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(450.0);
});

it('uses the flat shipping override and skips the base fee', function () {
    $zone = zoneWithRate();
    $item = physicalCartItem(6500, 2, ['weight_kg' => 0.3, 'free_shipping' => false, 'flat_shipping_npr' => 200]);

    // Flat 200 x 2 = 400, no base fee.
    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(400.0);
});

it('ships free when the product is flagged free shipping', function () {
    $zone = zoneWithRate();
    $item = physicalCartItem(2800, 1, ['weight_kg' => 0.4, 'free_shipping' => true, 'flat_shipping_npr' => null]);

    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(0.0);
});

it('waives shipping once the free-over threshold is reached', function () {
    $zone = zoneWithRate(['free_over_npr' => 5000]);
    $item = physicalCartItem(6000, 1, ['weight_kg' => 0.5, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(0.0);
});

it('returns zero when the zone has no rate', function () {
    $zone = ShippingZone::factory()->create()->load('rate');
    $item = physicalCartItem(1000, 1, ['weight_kg' => 0.5, 'free_shipping' => false, 'flat_shipping_npr' => null]);

    $fee = app(ShippingCalculator::class)->forItems($zone, new Collection([$item]));

    expect($fee)->toBe(0.0);
});
