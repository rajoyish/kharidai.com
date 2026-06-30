<?php

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('can view the homepage', function () {
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('seo.image', asset('kharidai_og.png')),
    );
});

it('renders the default og image tags in the app shell', function () {
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertSee(
        sprintf(
            '<meta data-inertia="og:image" property="og:image" content="%s" />',
            asset('kharidai_og.png'),
        ),
        false,
    );
    $response->assertSee(
        sprintf(
            '<meta data-inertia="twitter:image" name="twitter:image" content="%s" />',
            asset('kharidai_og.png'),
        ),
        false,
    );
});

it('can view a single product page', function () {
    $product = Product::factory()->create([
        'title' => 'Test Product',
        'in_stock' => true,
    ]);

    $response = $this->get('/products/'.$product->slug);

    $response->assertSuccessful();
});
