<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('strips the hidden description from the product page payload for guests', function () {
    $product = Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Members-only download instructions',
    ]);

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->missing('product.hidden_description'),
        )
        ->assertDontSee('Members-only download instructions');
});

it('exposes the hidden description to authenticated users on the product page', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Members-only download instructions',
    ]);

    $this->actingAs($user)
        ->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.hidden_description', 'Members-only download instructions'),
        );
});

it('never serializes the hidden description on storefront listing pages', function () {
    Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Members-only download instructions',
    ]);

    $this->get(route('digital-products.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->missing('uncategorizedProducts.0.hidden_description'),
        )
        ->assertDontSee('Members-only download instructions');
});

it('stores the hidden description when an admin creates a digital product', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)->post('/admin/products', [
        'type' => 'digital',
        'title' => 'Digital Product',
        'description' => 'Public description',
        'hidden_description' => '<p>Secret content</p>',
        'in_stock' => true,
        'is_visible' => true,
    ])->assertRedirect('/admin/products');

    expect(Product::firstWhere('title', 'Digital Product')->hidden_description)
        ->toBe('<p>Secret content</p>');
});

it('updates the hidden description when an admin edits a digital product', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['hidden_description' => '<p>Old secret</p>']);

    $this->actingAs($admin)->put("/admin/products/{$product->slug}", [
        'type' => 'digital',
        'title' => $product->title,
        'description' => $product->description,
        'hidden_description' => '<p>New secret</p>',
        'in_stock' => true,
        'is_visible' => true,
    ])->assertRedirect('/admin/products');

    expect($product->fresh()->hidden_description)->toBe('<p>New secret</p>');
});

it('discards the hidden description when a product is saved as a non-digital type', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['hidden_description' => '<p>Secret</p>']);

    $this->actingAs($admin)->put("/admin/products/{$product->slug}", [
        'type' => 'physical',
        'title' => $product->title,
        'description' => $product->description,
        'hidden_description' => '<p>Secret</p>',
        'in_stock' => true,
        'is_visible' => true,
    ])->assertRedirect('/admin/products');

    expect($product->fresh()->hidden_description)->toBeNull();
});

it('exposes the hidden description on the admin edit page so the form can populate', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['hidden_description' => '<p>Secret</p>']);

    $this->actingAs($admin)
        ->get("/admin/products/{$product->slug}/edit")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.hidden_description', '<p>Secret</p>'),
        );
});
