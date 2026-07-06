<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('exposes physical product variants to guests', function () {
    $product = Product::factory()->physical()->create(['in_stock' => true]);
    $product->variants()->create(['name' => 'Small', 'price_npr' => 500, 'purchase_price_npr' => 300]);

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canViewVariants', true)
            ->where('startingPrice', null)
            ->has('product.variants', 1)
            ->where('product.variants.0.name', 'Small'),
        );
});

it('exposes service product variants to guests', function () {
    $product = Product::factory()->service()->create(['in_stock' => true]);
    $product->variants()->create(['name' => 'Basic', 'price_npr' => 1500, 'purchase_price_npr' => 900]);

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canViewVariants', true)
            ->has('product.variants', 1),
        );
});

it('hides digital variant rows from guests and exposes only the starting price', function () {
    $product = Product::factory()->create(['in_stock' => true]); // digital by default
    $product->variants()->create(['name' => 'Monthly', 'price_npr' => 900, 'purchase_price_npr' => 500]);
    $product->variants()->create(['name' => 'Yearly', 'price_npr' => 300, 'purchase_price_npr' => 200]);

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canViewVariants', false)
            ->where('startingPrice', 300)
            ->missing('product.variants'),
        );
});

it('exposes digital variant rows to authenticated users', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['in_stock' => true]);
    $product->variants()->create(['name' => 'Monthly', 'price_npr' => 900, 'purchase_price_npr' => 500]);

    $this->actingAs($user)
        ->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canViewVariants', true)
            ->where('startingPrice', null)
            ->has('product.variants', 1),
        );
});

it('sends an aggregate starting price on the storefront without leaking variant rows', function () {
    $product = Product::factory()->create(['in_stock' => true, 'is_visible' => true]);
    $product->variants()->create(['name' => 'Cheapest', 'price_npr' => 250, 'purchase_price_npr' => 100]);
    $product->variants()->create(['name' => 'Pricey', 'price_npr' => 999, 'purchase_price_npr' => 500]);

    $this->get(route('digital-products.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('uncategorizedProducts.0.starting_price_cents', 25000)
            ->where('uncategorizedProducts.0.variants_count', 2)
            ->missing('uncategorizedProducts.0.variants'),
        );
});
