<?php

use App\Enums\ProductType;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('defaults new products to the digital type and visible', function () {
    $product = Product::factory()->create();

    expect($product->type)->toBe(ProductType::Digital)
        ->and($product->is_visible)->toBeTrue();
});

it('casts the product type to the enum', function () {
    $product = Product::factory()->physical()->create();

    expect($product->type)->toBe(ProductType::Physical);
});

it('hides products flagged as not visible from the product page', function () {
    $product = Product::factory()->hidden()->create(['in_stock' => true]);

    $this->get(route('products.show', $product))->assertNotFound();
});

it('excludes hidden products from category listings', function () {
    $category = Category::factory()->create();

    Product::factory()->create([
        'category_id' => $category->id,
        'title' => 'Visible Product',
        'in_stock' => true,
        'is_visible' => true,
    ]);
    Product::factory()->hidden()->create([
        'category_id' => $category->id,
        'title' => 'Hidden Product',
        'in_stock' => true,
    ]);

    $this->get(route('categories.show', $category))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.title', 'Visible Product'),
        );
});

it('lets an admin toggle product visibility', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['is_visible' => true]);

    $this->actingAs($admin)
        ->patch('/admin/products/'.$product->slug.'/toggle-visibility')
        ->assertRedirect();

    expect($product->refresh()->is_visible)->toBeFalse();
});

it('persists the selected type when an admin creates a product', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Logo Design',
        'description' => 'A service',
        'in_stock' => true,
        'is_visible' => true,
        'pricing_strategy' => 'per_hour',
        'pricing_config' => ['hourly_rate_npr' => 1500],
    ])->assertRedirect();

    $this->assertDatabaseHas('products', [
        'title' => 'Logo Design',
        'type' => 'service',
        'is_visible' => true,
    ]);
});
