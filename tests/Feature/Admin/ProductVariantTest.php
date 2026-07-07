<?php

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list product variants', function () {
    $product = Product::factory()->create();
    ProductVariant::factory()->count(3)->create(['product_id' => $product->id]);

    $response = $this->actingAs($this->admin)->get('/admin/products/'.$product->slug.'/variants');

    $response->assertSuccessful();
});

it('can create a product variant', function () {
    $product = Product::factory()->create();

    $response = $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'New Variant',
        'price_npr' => 1000,
        'purchase_price_npr' => 800,
        'validity_days' => 30,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));
    $this->assertDatabaseHas('product_variants', [
        'product_id' => $product->id,
        'name' => 'New Variant',
        'price_npr' => 1000 * 100,
        'validity_days' => 30,
    ]);
});

it('can create a physical variant with color and size option lists and a weight', function () {
    $product = Product::factory()->physical()->create();

    $response = $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'Regular',
        'price_npr' => 2500,
        'colors' => ['Red', 'Black', 'White'],
        'sizes' => ['XL', '2XXL', '3XXL'],
        'weight_kg' => 0.5,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));

    $variant = $product->variants()->firstWhere('name', 'Regular');
    expect($variant->colors)->toBe(['Red', 'Black', 'White']);
    expect($variant->sizes)->toBe(['XL', '2XXL', '3XXL']);
    expect((float) $variant->weight_kg)->toBe(0.5);
});

it('persists the ships-individually flag on a variant', function () {
    $product = Product::factory()->physical()->create();

    $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'Bulky',
        'price_npr' => 2000,
        'weight_kg' => 1.82,
        'ships_individually' => true,
    ]);

    $variant = $product->variants()->firstWhere('name', 'Bulky');
    expect($variant->ships_individually)->toBeTrue();
});

it('persists the advance payment percentage on a variant', function () {
    $product = Product::factory()->physical()->create();

    $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'Deposit',
        'price_npr' => 2000,
        'advance_payment_percent' => 30,
    ]);

    $variant = $product->variants()->firstWhere('name', 'Deposit');
    expect($variant->advance_payment_percent)->toBe(30);
    expect($variant->advancePaymentNpr())->toBe(600.0);
});

it('rejects an advance payment percentage above 100', function () {
    $product = Product::factory()->physical()->create();

    $response = $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'Broken',
        'price_npr' => 1000,
        'advance_payment_percent' => 150,
    ]);

    $response->assertSessionHasErrors('advance_payment_percent');
});

it('trims blank options from the lists', function () {
    $product = Product::factory()->physical()->create();

    $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'Regular',
        'price_npr' => 1000,
        'colors' => ['Red', ' '],
        'sizes' => ['M'],
    ]);

    $variant = $product->variants()->firstWhere('name', 'Regular');
    expect($variant->colors)->toBe(['Red']);
    expect($variant->sizes)->toBe(['M']);
});

it('rejects a negative weight for a physical variant', function () {
    $product = Product::factory()->physical()->create();

    $response = $this->actingAs($this->admin)->post('/admin/products/'.$product->slug.'/variants', [
        'name' => 'Broken',
        'price_npr' => 1000,
        'weight_kg' => -5,
    ]);

    $response->assertSessionHasErrors('weight_kg');
});

it('can update the option lists and weight of a variant', function () {
    $product = Product::factory()->physical()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'colors' => ['Red'],
        'sizes' => ['S'],
        'weight_kg' => 0.1,
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug.'/variants/'.$variant->id, [
        'name' => $variant->name,
        'price_npr' => 1200,
        'colors' => ['Blue', 'Green'],
        'sizes' => ['L', 'XL'],
        'weight_kg' => 0.75,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));

    $variant->refresh();
    expect($variant->colors)->toBe(['Blue', 'Green']);
    expect($variant->sizes)->toBe(['L', 'XL']);
    expect((float) $variant->weight_kg)->toBe(0.75);
});

it('can update a product variant', function () {
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'name' => 'Old Variant',
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug.'/variants/'.$variant->id, [
        'name' => 'Updated Variant',
        'price_npr' => 1200,
        'validity_days' => null,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));
    $this->assertDatabaseHas('product_variants', [
        'id' => $variant->id,
        'name' => 'Updated Variant',
        'price_npr' => 1200 * 100,
        'validity_days' => null,
    ]);
});

it('can delete a product variant', function () {
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

    $response = $this->actingAs($this->admin)->delete('/admin/products/'.$product->slug.'/variants/'.$variant->id);

    $response->assertRedirect(route('admin.products.variants.index', $product));
    $this->assertDatabaseMissing('product_variants', [
        'id' => $variant->id,
    ]);
});
