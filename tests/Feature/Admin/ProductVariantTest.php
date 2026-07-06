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
        'weight_grams' => 500,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));

    $variant = $product->variants()->firstWhere('name', 'Regular');
    expect($variant->colors)->toBe(['Red', 'Black', 'White']);
    expect($variant->sizes)->toBe(['XL', '2XXL', '3XXL']);
    expect($variant->weight_grams)->toBe(500);
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
        'weight_grams' => -5,
    ]);

    $response->assertSessionHasErrors('weight_grams');
});

it('can update the option lists and weight of a variant', function () {
    $product = Product::factory()->physical()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'colors' => ['Red'],
        'sizes' => ['S'],
        'weight_grams' => 100,
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug.'/variants/'.$variant->id, [
        'name' => $variant->name,
        'price_npr' => 1200,
        'colors' => ['Blue', 'Green'],
        'sizes' => ['L', 'XL'],
        'weight_grams' => 750,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));

    $variant->refresh();
    expect($variant->colors)->toBe(['Blue', 'Green']);
    expect($variant->sizes)->toBe(['L', 'XL']);
    expect($variant->weight_grams)->toBe(750);
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
