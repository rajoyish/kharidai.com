<?php

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Restricted pricing must be withheld by the server, not merely hidden by the
 * UI. These assertions scan the whole response body — meta tags, JSON-LD, and
 * the Inertia `data-page` prop blob all land in the same HTML source, so a
 * price anywhere in it is readable with "View Source" and by any crawler.
 */
it('never ships wholesale cost to the storefront', function () {
    $product = Product::factory()->physical()->create();
    ProductVariant::factory()->for($product)->create([
        'price_npr' => 500.00,
        'purchase_price_npr' => 4444.44,
        'show_pricing' => true,
    ]);

    $html = $this->get(route('products.show', $product))->getContent();

    expect($html)->not->toContain('4444.44')
        ->and($html)->not->toContain('purchase_price');
});

it('withholds the amount for quote-on-request variants', function () {
    $product = Product::factory()->physical()->create();
    ProductVariant::factory()->for($product)->create([
        'name' => 'Bespoke Order',
        'price_npr' => 9999.99,
        'show_pricing' => false,
    ]);

    $html = $this->get(route('products.show', $product))->getContent();

    // The row itself still travels — the shopper needs its name to select it —
    // but the price it hides must not be recoverable from the source.
    expect($html)->toContain('Bespoke Order')
        ->and($html)->not->toContain('9999.99');
});

it('hides other digital variant prices from guests while keeping the starting price', function () {
    $product = Product::factory()->create(['type' => 'digital']);
    ProductVariant::factory()->for($product)->create(['price_npr' => 250.00, 'show_pricing' => true]);
    ProductVariant::factory()->for($product)->create(['price_npr' => 1234.56, 'show_pricing' => true]);

    $html = $this->get(route('products.show', $product))->getContent();

    // "Starting at" must keep working: the lowest price is public, the dearer
    // variant behind the login wall is not.
    expect($html)->toContain('250')
        ->and($html)->not->toContain('1234.56');
});

it('still lets admins see wholesale cost', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->physical()->create();
    $variant = ProductVariant::factory()->for($product)->create([
        'purchase_price_npr' => 4444.44,
        'show_pricing' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.products.variants.index', $product))
        ->assertSee('4444.44', false);

    $this->actingAs($admin)
        ->get(route('admin.products.variants.edit', [$product, $variant]))
        ->assertSee('4444.44', false);
});
