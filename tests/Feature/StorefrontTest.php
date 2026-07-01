<?php

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('can view the homepage', function () {
    $expectedImage = asset('kharidai_og.png').'?v='.filemtime(public_path('kharidai_og.png'));
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('seo.title', 'Your all-in-one marketplace! - '.config('app.name'))
        ->where('seo.description', 'Shop digital goods, subscriptions, services, and physical products from Kharidai.')
        ->where('seo.image', $expectedImage)
        ->where('seo.imageType', 'image/png')
        ->where('seo.imageWidth', 1200)
        ->where('seo.imageHeight', 630),
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
    $expectedImage = asset('kharidai_og.png').'?v='.filemtime(public_path('kharidai_og.png'));
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
            $expectedImage,
        ),
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image:type" property="og:image:type" content="image/png" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image:width" property="og:image:width" content="1200" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image:height" property="og:image:height" content="630" />',
        false,
    );
    $response->assertSee(
        sprintf(
            '<meta data-inertia="twitter:image" name="twitter:image" content="%s" />',
            $expectedImage,
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
    Storage::fake('public');
    Storage::disk('public')->put(
        'products/test-product.png',
        file_get_contents(public_path('kharidai_og.png')),
    );

    $product = Product::factory()->create([
        'title' => 'Test Product',
        'description' => '<p>This is a <strong>great</strong> product for testing.</p><h2>Benefits</h2><p>Works well.</p>',
        'image' => 'products/test-product.png',
        'in_stock' => true,
    ]);
    $expectedImage = asset('storage/products/test-product.png').'?v='.$product->updated_at->timestamp;

    $response = $this->get('/products/'.$product->slug);

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Products/Show')
        ->where('seo.title', 'Test Product - '.config('app.name'))
        ->where('seo.description', 'This is a great product for testing.')
        ->where('seo.image', $expectedImage)
        ->where('seo.imageAlt', 'Test Product')
        ->where('seo.imageType', 'image/png')
        ->where('seo.imageWidth', 1200)
        ->where('seo.imageHeight', 630)
        ->where('seo.type', 'product')
        ->where('seo.updatedTime', $product->updated_at->toAtomString()),
    );
    $response->assertSee(
        '<title>Test Product - '.config('app.name').'</title>',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image" property="og:image" content="'.$expectedImage.'" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image:type" property="og:image:type" content="image/png" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image:width" property="og:image:width" content="1200" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:image:height" property="og:image:height" content="630" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="twitter:image" name="twitter:image" content="'.$expectedImage.'" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:description" property="og:description" content="This is a great product for testing." />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="twitter:url" name="twitter:url" content="'.route('products.show', $product).'" />',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="og:updated_time" property="og:updated_time" content="'.$product->updated_at->toAtomString().'" />',
        false,
    );

    $content = $response->getContent();

    expect($content)->not->toBeFalse();
    expect(strpos($content, '<meta data-inertia="og:image" property="og:image" content="'.$expectedImage.'" />'))
        ->toBeLessThan(strpos($content, 'window.matchMedia'));
});
