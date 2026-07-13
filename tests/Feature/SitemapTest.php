<?php

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can view the sitemap', function () {
    $listedProduct = Product::factory()->create([
        'title' => 'Listed Product',
        'in_stock' => true,
    ]);
    $hiddenProduct = Product::factory()->create([
        'title' => 'Hidden Product',
        'in_stock' => false,
    ]);

    $response = $this->get('/sitemap.xml');

    $response->assertSuccessful();
    $response->assertHeader('Content-Type', 'application/xml');
    $response->assertSee(route('home'), false);
    $response->assertSee(route('products.show', $listedProduct), false);
    $response->assertDontSee(route('products.show', $hiddenProduct), false);
    $response->assertDontSee('/about', false);
    $response->assertDontSee('/contact', false);
    $response->assertDontSee('/products</loc>', false);
});

it('omits in-stock products that are hidden from the storefront', function () {
    // The product page 404s unless a product is both in stock *and* visible, so
    // listing an in-stock-but-hidden product would advertise a dead URL.
    $hidden = Product::factory()->hidden()->create(['in_stock' => true]);

    $this->get(route('products.show', $hidden))->assertNotFound();

    $this->get('/sitemap.xml')
        ->assertSuccessful()
        ->assertDontSee(route('products.show', $hidden), false);
});

it('lists the type listing pages and categories that hold listable products', function () {
    $stocked = Category::factory()->create(['type' => 'physical']);
    $stocked->products()->attach(Product::factory()->physical()->create());

    $empty = Category::factory()->create(['type' => 'physical']);

    $response = $this->get('/sitemap.xml');

    $response->assertSee(route('digital-products.index'), false);
    $response->assertSee(route('physical-products.index'), false);
    $response->assertSee(route('services.index'), false);
    $response->assertSee(route('categories.show', $stocked), false);
    $response->assertDontSee(route('categories.show', $empty), false);
});
