<?php

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('can view the homepage', function () {
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('seo.title', 'Your all-in-one marketplace! - '.config('app.name'))
        ->where('seo.description', 'Shop digital goods, subscriptions, services, and physical products from Kharidai.')
        ->where('seo.image', asset('kharidai_og.png')),
    );
});

it('can view the homepage when categories include in-stock products', function () {
    $category = Category::factory()->create();

    Product::factory()->create([
        'category_id' => $category->id,
        'title' => 'Categorized Product',
        'in_stock' => true,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->has('categories', 1)
        ->where('categories.0.name', $category->name)
        ->where('categories.0.products.0.title', 'Categorized Product'),
    );
});

it('renders the homepage seo tags in the app shell', function () {
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertSee(
        '<title>Your all-in-one marketplace! - '.config('app.name').'</title>',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="description" name="description" content="Shop digital goods, subscriptions, services, and physical products from Kharidai." />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:title" property="og:title" content="Your all-in-one marketplace! - '.config('app.name').'" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="twitter:title" name="twitter:title" content="Your all-in-one marketplace! - '.config('app.name').'" />',
        false,
    );
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

it('renders the echo config from cached configuration values', function () {
    config()->set('broadcasting.connections.pusher.frontend', [
        'key' => 'production-client-key',
        'cluster' => 'ap2',
        'wsHost' => 'ws-ap2.pusher.com',
        'wsPort' => 6001,
        'wssPort' => 6001,
        'forceTLS' => false,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertSee('window.EchoConfig = JSON.parse(', false);
    $response->assertSee('production-client-key');
    $response->assertSee('ws-ap2.pusher.com');
    $response->assertSee('6001');
});

it('does not render the echo config when the pusher key is missing', function () {
    config()->set('broadcasting.connections.pusher.frontend', [
        'key' => null,
        'cluster' => 'ap2',
        'wsHost' => 'ws-ap2.pusher.com',
        'wsPort' => 6001,
        'wssPort' => 6001,
        'forceTLS' => false,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertDontSee('window.EchoConfig =', false);
});

it('can view a single product page', function () {
    $product = Product::factory()->create([
        'title' => 'Test Product',
        'description' => '<p>This is a <strong>great</strong> product for testing.</p>',
        'image' => 'products/test-product.jpg',
        'in_stock' => true,
    ]);

    $response = $this->get('/products/'.$product->slug);

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Products/Show')
        ->where('seo.title', 'Test Product - '.config('app.name'))
        ->where('seo.description', 'This is a great product for testing.')
        ->where('seo.image', asset('storage/products/test-product.jpg'))
        ->where('seo.imageAlt', 'Test Product')
        ->where('seo.type', 'product'),
    );
    $response->assertSee(
        '<title>Test Product - '.config('app.name').'</title>',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image" property="og:image" content="'.asset('storage/products/test-product.jpg').'" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="twitter:image" name="twitter:image" content="'.asset('storage/products/test-product.jpg').'" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:description" property="og:description" content="This is a great product for testing." />',
        false,
    );
});
