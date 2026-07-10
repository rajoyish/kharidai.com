<?php

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\ShippingRate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('monetary values are stored as integer paisa', function () {
    $variant = ProductVariant::factory()->create(['price_npr' => 2160]);

    expect($variant->getRawOriginal('price_npr'))->toBe(216000)
        ->and($variant->price_npr)->toBe(2160.0);
});

test('fractional rupees round to whole paisa instead of truncating', function () {
    // 19.99 * 100 === 1998.9999999999998 in floats; the cast must store 1999.
    $variant = ProductVariant::factory()->create(['price_npr' => 19.99]);

    expect($variant->getRawOriginal('price_npr'))->toBe(1999)
        ->and($variant->fresh()->price_npr)->toBe(19.99);
});

test('order totals survive a round trip without float drift', function () {
    $order = Order::factory()->create([
        'total_amount' => 1234.56,
        'items_total' => 1200.06,
        'shipping_total' => 34.50,
    ]);

    $fresh = $order->fresh();

    expect($fresh->total_amount)->toBe(1234.56)
        ->and($fresh->items_total)->toBe(1200.06)
        ->and($fresh->shipping_total)->toBe(34.50);
});

test('nullable money columns keep null instead of casting to zero', function () {
    $rate = ShippingRate::factory()->create(['free_over_npr' => null]);

    expect($rate->free_over_npr)->toBeNull()
        ->and($rate->getRawOriginal('free_over_npr'))->toBeNull();
});
