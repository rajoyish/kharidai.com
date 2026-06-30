<?php

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list products', function () {
    Product::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)->get('/admin/products');

    $response->assertSuccessful();
});

it('can create a product', function () {
    $response = $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'New Product',
        'description' => 'Test description',
        'in_stock' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'title' => 'New Product',
        'in_stock' => true,
    ]);
});

it('can update a product', function () {
    $product = Product::factory()->create(['title' => 'Old Product']);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug, [
        'title' => 'Updated Product',
        'description' => 'Updated description',
        'in_stock' => false,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'title' => 'Updated Product',
        'in_stock' => false,
    ]);
});

it('preserves product image when updating without a new image', function () {
    Storage::fake('public');

    $oldImagePath = 'products/old-product.jpg';
    Storage::disk('public')->put($oldImagePath, 'old image');
    $product = Product::factory()->create([
        'image' => $oldImagePath,
        'title' => 'Old Product',
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug, [
        'title' => 'Updated Product',
        'description' => 'Updated description',
        'image' => null,
        'in_stock' => false,
    ]);

    $response->assertRedirect();

    $product->refresh();

    expect($product->image)->toBe($oldImagePath);
    Storage::disk('public')->assertExists($oldImagePath);
});

it('replaces product image and deletes the old image when a new image is uploaded', function () {
    Storage::fake('public');

    $oldImagePath = 'products/old-product.jpg';
    Storage::disk('public')->put($oldImagePath, 'old image');
    $product = Product::factory()->create([
        'image' => $oldImagePath,
        'title' => 'Old Product',
    ]);
    $newImage = UploadedFile::fake()->image('new-product.jpg');

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug, [
        'title' => 'Updated Product',
        'description' => 'Updated description',
        'image' => $newImage,
        'in_stock' => false,
    ]);

    $response->assertRedirect();

    $product->refresh();

    expect($product->image)
        ->not->toBe($oldImagePath)
        ->and($product->image)->toStartWith('products/');

    Storage::disk('public')->assertMissing($oldImagePath);
    Storage::disk('public')->assertExists($product->image);
});

it('can delete a product', function () {
    $product = Product::factory()->create();

    $response = $this->actingAs($this->admin)->delete('/admin/products/'.$product->slug);

    $response->assertRedirect();
    $this->assertDatabaseMissing('products', [
        'id' => $product->id,
    ]);
});

it('can delete a product with variants', function () {
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

    $response = $this->actingAs($this->admin)->delete('/admin/products/'.$product->slug);

    $response->assertRedirect(route('admin.products.index'));
    $this->assertDatabaseMissing('products', [
        'id' => $product->id,
    ]);
    $this->assertDatabaseMissing('product_variants', [
        'id' => $variant->id,
    ]);
});

it('can toggle product stock status', function () {
    $product = Product::factory()->create(['in_stock' => true]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug.'/toggle-stock');

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'in_stock' => false,
    ]);
});
