<?php

use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use App\Services\Shipping\ShippingCalculator;
use Illuminate\Database\Eloquent\Collection;

it('calculates shipping when a variant has no weight and no physical detail row', function () {
    $product = Product::factory()->physical()->create();

    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'price_npr' => 500,
        'weight_kg' => null,
    ]);

    $item = CartItem::factory()->create([
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ])->load('productVariant.product.physicalDetail');

    expect($item->productVariant->product->physicalDetail)->toBeNull();

    $zone = ShippingZone::factory()->create();
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'base_fee_npr' => 100,
        'per_kg_fee_npr' => 50,
        'free_over_npr' => null,
    ]);

    $fee = app(ShippingCalculator::class)->forItems(
        $zone->load('rate'),
        new Collection([$item]),
    );

    expect($fee)->toBeFloat();
});
