<?php

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can view the homepage', function () {
    $response = $this->get('/');

    $response->assertSuccessful();
});

it('can view a single product page', function () {
    $product = Product::factory()->create([
        'title' => 'Test Product',
        'in_stock' => true,
    ]);

    $response = $this->get('/products/' . $product->id);

    $response->assertSuccessful();
});
