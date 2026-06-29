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

    $response = $this->actingAs($this->admin)->get('/admin/products/'.$product->id.'/variants');

    $response->assertSuccessful();
});

it('can create a product variant', function () {
    $product = Product::factory()->create();

    $response = $this->actingAs($this->admin)->post('/admin/products/'.$product->id.'/variants', [
        'name' => 'New Variant',
        'price_npr' => 1000,
        'purchase_price_npr' => 800,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));
    $this->assertDatabaseHas('product_variants', [
        'product_id' => $product->id,
        'name' => 'New Variant',
        'price_npr' => 1000 * 100,
    ]);
});

it('can update a product variant', function () {
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'name' => 'Old Variant',
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->id.'/variants/'.$variant->id, [
        'name' => 'Updated Variant',
        'price_npr' => 1200,
    ]);

    $response->assertRedirect(route('admin.products.variants.index', $product));
    $this->assertDatabaseHas('product_variants', [
        'id' => $variant->id,
        'name' => 'Updated Variant',
        'price_npr' => 1200 * 100,
    ]);
});

it('can delete a product variant', function () {
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

    $response = $this->actingAs($this->admin)->delete('/admin/products/'.$product->id.'/variants/'.$variant->id);

    $response->assertRedirect(route('admin.products.variants.index', $product));
    $this->assertDatabaseMissing('product_variants', [
        'id' => $variant->id,
    ]);
});
