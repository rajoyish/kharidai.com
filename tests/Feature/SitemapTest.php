<?php

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
