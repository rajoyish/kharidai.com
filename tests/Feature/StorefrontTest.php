<?php

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('can view the homepage', function () {
    $expectedImage = asset('kharidai_og.png');
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

it('shares storefront navigation categories separately from page categories', function () {
    $visibleCategory = Category::factory()->create([
        'name' => 'Visible Category',
    ]);
    $hiddenCategory = Category::factory()->create([
        'name' => 'Hidden Category',
    ]);

    Product::factory()->create([
        'category_id' => $visibleCategory->id,
        'title' => 'Visible Product',
        'in_stock' => true,
    ]);
    Product::factory()->create([
        'category_id' => $hiddenCategory->id,
        'title' => 'Hidden Product',
        'in_stock' => false,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->has('categories', 1)
        ->where('categories.0.name', $visibleCategory->name)
        ->has('storefront.categories', 1)
        ->where('storefront.categories.0.name', $visibleCategory->name)
        ->missing('storefront.categories.0.products'),
    );
});

it('refreshes cached storefront navigation when product stock changes', function () {
    $category = Category::factory()->create([
        'name' => 'Cached Category',
    ]);
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'title' => 'Cached Product',
        'in_stock' => true,
    ]);

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('categories', 1)
            ->has('storefront.categories', 1)
            ->where('storefront.categories.0.name', $category->name),
        );

    $product->update([
        'in_stock' => false,
    ]);

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('categories', 0)
            ->has('storefront.categories', 0),
        );
});

it('recovers from an invalid storefront navigation cache payload', function () {
    $category = Category::factory()->create([
        'name' => 'Recovered Category',
    ]);

    Product::factory()->create([
        'category_id' => $category->id,
        'title' => 'Recovered Product',
        'in_stock' => true,
    ]);

    Cache::put(
        Category::STOREFRONT_NAVIGATION_CACHE_KEY,
        new stdClass,
    );

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('storefront.categories', 1)
            ->where('storefront.categories.0.name', $category->name),
        );
});

it('can view a category page with its in-stock products', function () {
    $category = Category::factory()->create([
        'name' => 'Subscriptions',
    ]);
    $otherCategory = Category::factory()->create([
        'name' => 'Tools',
    ]);

    Product::factory()->create([
        'category_id' => $category->id,
        'title' => 'Visible Product',
        'in_stock' => true,
    ]);
    Product::factory()->create([
        'category_id' => $category->id,
        'title' => 'Hidden Product',
        'in_stock' => false,
    ]);
    Product::factory()->create([
        'category_id' => $otherCategory->id,
        'title' => 'Other Category Product',
        'in_stock' => true,
    ]);

    $response = $this->get(route('categories.show', $category));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Categories/Show')
        ->where('category.name', $category->name)
        ->has('category.products', 1)
        ->where('category.products.0.title', 'Visible Product')
        ->has('categories', 2)
        ->where('seo.title', $category->name.' - '.config('app.name'))
        ->where('seo.url', route('categories.show', $category)),
    );
    $response->assertSee(
        '<title>'.$category->name.' - '.config('app.name').'</title>',
        false,
    );
    $response->assertSee(
        '<meta data-inertia="twitter:url" name="twitter:url" content="'.route('categories.show', $category).'" />',
        false,
    );
});

it('renders the homepage seo tags in the app shell', function () {
    $expectedImage = asset('kharidai_og.png');
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
    $temporaryPublicDiskRoot = storage_path('framework/testing/disks/public-seo');

    File::deleteDirectory($temporaryPublicDiskRoot);
    File::ensureDirectoryExists($temporaryPublicDiskRoot.'/products');
    File::copy(
        public_path('kharidai_og.png'),
        $temporaryPublicDiskRoot.'/products/test-product.png',
    );
    config()->set('filesystems.disks.public', [
        'driver' => 'local',
        'root' => $temporaryPublicDiskRoot,
        'url' => 'https://files.kharidai.test/storage',
        'visibility' => 'public',
        'throw' => false,
        'report' => false,
    ]);
    Storage::forgetDisk('public');

    $product = Product::factory()->create([
        'title' => 'Test Product',
        'description' => '<p>This is a <strong>great</strong> product for testing.</p><h2>Benefits</h2><p>Works well.</p>',
        'image' => 'products/test-product.png',
        'in_stock' => true,
    ]);

    $product->galleries()->create([
        'image_path' => 'products/gallery/test-gallery.png',
        'sort_order' => 0,
    ]);

    $expectedImage = 'https://files.kharidai.test/storage/products/test-product.png';

    $response = $this->get('/products/'.$product->slug);

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Products/Show')
        ->where('seo.title', 'Test Product - '.config('app.name'))
        ->has('product.galleries', 1)
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
