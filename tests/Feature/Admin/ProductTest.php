<?php

use App\Models\Category;
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

it('assigns multiple categories to a product on create', function () {
    $categories = Category::factory()->count(2)->create();

    $response = $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'Multi Category Product',
        'description' => 'Test description',
        'in_stock' => true,
        'category_ids' => $categories->pluck('id')->all(),
    ]);

    $response->assertRedirect();

    $product = Product::where('title', 'Multi Category Product')->firstOrFail();

    expect($product->categories->pluck('id')->all())
        ->toEqualCanonicalizing($categories->pluck('id')->all());
});

it('syncs categories when a product is updated', function () {
    $original = Category::factory()->create();
    $replacement = Category::factory()->create();
    $product = Product::factory()->hasAttached($original)->create();

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug, [
        'title' => $product->title,
        'description' => 'Updated description',
        'in_stock' => true,
        'category_ids' => [$replacement->id],
    ]);

    $response->assertRedirect();

    expect($product->fresh()->categories->pluck('id')->all())
        ->toEqual([$replacement->id]);
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

it('can create a product with new galleries', function () {
    Storage::fake('public');

    $response = $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'Product With Gallery',
        'description' => 'Test description',
        'in_stock' => true,
        'update_galleries' => 1,
        'new_galleries' => [
            UploadedFile::fake()->image('gallery1.jpg'),
            UploadedFile::fake()->image('gallery2.jpg'),
        ],
        'gallery_orders' => ['new:0', 'new:1'],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'title' => 'Product With Gallery',
    ]);

    $product = Product::where('title', 'Product With Gallery')->first();
    expect($product->galleries)->toHaveCount(2);
});

it('enforces total gallery limit of 6 on create', function () {
    Storage::fake('public');

    $response = $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'Product With Gallery',
        'description' => 'Test description',
        'in_stock' => true,
        'new_galleries' => [
            UploadedFile::fake()->image('gallery1.jpg'),
            UploadedFile::fake()->image('gallery2.jpg'),
            UploadedFile::fake()->image('gallery3.jpg'),
            UploadedFile::fake()->image('gallery4.jpg'),
            UploadedFile::fake()->image('gallery5.jpg'),
            UploadedFile::fake()->image('gallery6.jpg'),
            UploadedFile::fake()->image('gallery7.jpg'),
        ],
        'gallery_orders' => ['new:0', 'new:1', 'new:2', 'new:3', 'new:4', 'new:5', 'new:6'],
    ]);

    $response->assertSessionHasErrors('new_galleries');
    $this->assertDatabaseMissing('products', [
        'title' => 'Product With Gallery',
    ]);
});

it('can update a product with galleries and delete removed ones safely', function () {
    Storage::fake('public');

    $product = Product::factory()->create();
    $gallery1 = $product->galleries()->create([
        'image_path' => 'products/gallery/1.jpg',
        'sort_order' => 0,
    ]);
    $gallery2 = $product->galleries()->create([
        'image_path' => 'products/gallery/2.jpg',
        'sort_order' => 1,
    ]);

    Storage::disk('public')->put('products/gallery/1.jpg', 'content');
    Storage::disk('public')->put('products/gallery/2.jpg', 'content');

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->slug, [
        'title' => 'Updated Product',
        'description' => 'Updated description',
        'in_stock' => true,
        'update_galleries' => 1,
        'existing_galleries' => [$gallery1->id],
        'new_galleries' => [
            UploadedFile::fake()->image('gallery3.jpg'),
        ],
        'gallery_orders' => ['existing:'.$gallery1->id, 'new:0'],
    ]);

    $response->assertRedirect();

    $product->refresh();
    expect($product->galleries)->toHaveCount(2);

    // Check old file deleted
    Storage::disk('public')->assertMissing('products/gallery/2.jpg');
    // Check kept file exists
    Storage::disk('public')->assertExists('products/gallery/1.jpg');
});
