<?php

use App\Enums\ProductType;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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

it('groups the homepage into digital, physical and service sections', function () {
    $category = Category::factory()->create([
        'type' => ProductType::Digital,
    ]);

    Product::factory()->hasAttached($category)->create([
        'title' => 'Categorized Product',
        'in_stock' => true,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->has('sections', 3)
        ->where('sections.0.type', 'digital')
        ->where('sections.0.label', 'Digital Products')
        ->has('sections.0.categories', 1)
        ->where('sections.0.categories.0.name', $category->name)
        ->where('sections.0.categories.0.products.0.title', 'Categorized Product')
        ->where('sections.1.type', 'physical')
        ->has('sections.1.categories', 0)
        ->where('sections.2.type', 'service')
        ->has('sections.2.categories', 0),
    );
});

it('scopes homepage sections strictly by product type', function () {
    $digitalCategory = Category::factory()->create([
        'name' => 'Digital Downloads',
        'type' => ProductType::Digital,
    ]);
    $physicalCategory = Category::factory()->create([
        'name' => 'Gadgets',
        'type' => ProductType::Physical,
    ]);

    Product::factory()->hasAttached($digitalCategory)->create([
        'title' => 'A Digital Item',
        'in_stock' => true,
    ]);
    Product::factory()->physical()->hasAttached($physicalCategory)->create([
        'title' => 'A Physical Item',
        'in_stock' => true,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->has('sections.0.categories', 1)
        ->where('sections.0.categories.0.name', 'Digital Downloads')
        ->has('sections.1.categories', 1)
        ->where('sections.1.categories.0.name', 'Gadgets'),
    );
});

it('shares storefront navigation grouped by product type', function () {
    $visibleCategory = Category::factory()->create([
        'name' => 'Visible Category',
        'type' => ProductType::Digital,
    ]);
    $hiddenCategory = Category::factory()->create([
        'name' => 'Hidden Category',
        'type' => ProductType::Digital,
    ]);

    Product::factory()->hasAttached($visibleCategory)->create([
        'title' => 'Visible Product',
        'in_stock' => true,
    ]);
    Product::factory()->hasAttached($hiddenCategory)->create([
        'title' => 'Hidden Product',
        'in_stock' => false,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('sections.0.type', 'digital')
        ->has('sections.0.categories', 1)
        ->where('sections.0.categories.0.name', $visibleCategory->name)
        ->has('storefront.groups', 1)
        ->where('storefront.groups.0.type', 'digital')
        ->where('storefront.groups.0.label', 'Digital Products')
        ->has('storefront.groups.0.categories', 1)
        ->where('storefront.groups.0.categories.0.name', $visibleCategory->name)
        ->missing('storefront.groups.0.categories.0.products'),
    );
});

it('refreshes cached storefront navigation when product stock changes', function () {
    $category = Category::factory()->create([
        'name' => 'Cached Category',
        'type' => ProductType::Digital,
    ]);
    $product = Product::factory()->hasAttached($category)->create([
        'title' => 'Cached Product',
        'in_stock' => true,
    ]);

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('sections.0.categories', 1)
            ->has('storefront.groups', 1)
            ->where('storefront.groups.0.categories.0.name', $category->name),
        );

    $product->update([
        'in_stock' => false,
    ]);

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('sections.0.categories', 0)
            ->has('storefront.groups', 0),
        );
});

it('recovers from an invalid storefront navigation cache payload', function () {
    $category = Category::factory()->create([
        'name' => 'Recovered Category',
        'type' => ProductType::Digital,
    ]);

    Product::factory()->hasAttached($category)->create([
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
            ->has('storefront.groups', 1)
            ->where('storefront.groups.0.categories.0.name', $category->name),
        );
});

it('can view a category page with its in-stock products', function () {
    $category = Category::factory()->create([
        'name' => 'Subscriptions',
    ]);
    $otherCategory = Category::factory()->create([
        'name' => 'Tools',
    ]);

    Product::factory()->hasAttached($category)->create([
        'title' => 'Visible Product',
        'in_stock' => true,
    ]);
    Product::factory()->hasAttached($category)->create([
        'title' => 'Hidden Product',
        'in_stock' => false,
    ]);
    Product::factory()->hasAttached($otherCategory)->create([
        'title' => 'Other Category Product',
        'in_stock' => true,
    ]);

    $response = $this->get(route('categories.show', $category));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Categories/Show')
        ->where('category.name', $category->name)
        ->has('products.data', 1)
        ->where('products.data.0.title', 'Visible Product')
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

it('renders the digital products page scoped to digital data only', function () {
    $digitalCategory = Category::factory()->create([
        'name' => 'Digital Downloads',
        'type' => ProductType::Digital,
    ]);
    $physicalCategory = Category::factory()->create([
        'name' => 'Gadgets',
        'type' => ProductType::Physical,
    ]);

    Product::factory()->hasAttached($digitalCategory)->create([
        'title' => 'Digital Item',
        'in_stock' => true,
    ]);
    Product::factory()->physical()->hasAttached($physicalCategory)->create([
        'title' => 'Physical Item',
        'in_stock' => true,
    ]);

    $response = $this->get(route('digital-products.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/DigitalProducts')
        ->where('type', 'digital')
        ->where('label', 'Digital Products')
        ->has('categories', 1)
        ->where('categories.0.name', 'Digital Downloads')
        ->where('categories.0.products.0.title', 'Digital Item')
        ->where('seo.title', 'Digital Products - '.config('app.name'))
        ->where('seo.url', route('digital-products.index')),
    );
});

it('renders the physical products page scoped to physical data only', function () {
    $physicalCategory = Category::factory()->create([
        'name' => 'Gadgets',
        'type' => ProductType::Physical,
    ]);

    Category::factory()->create([
        'name' => 'Digital Downloads',
        'type' => ProductType::Digital,
    ]);

    Product::factory()->physical()->hasAttached($physicalCategory)->create([
        'title' => 'Physical Item',
        'in_stock' => true,
    ]);

    $response = $this->get(route('physical-products.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/PhysicalProducts')
        ->where('type', 'physical')
        ->has('categories', 1)
        ->where('categories.0.name', 'Gadgets'),
    );
});

it('renders the public services page scoped to service data only', function () {
    $serviceCategory = Category::factory()->create([
        'name' => 'Consulting',
        'type' => ProductType::Service,
    ]);

    Product::factory()->service()->hasAttached($serviceCategory)->create([
        'title' => 'Advisory Service',
        'in_stock' => true,
    ]);

    $response = $this->get(route('services.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/Services')
        ->where('type', 'service')
        ->where('label', 'Services')
        ->has('categories', 1)
        ->where('categories.0.name', 'Consulting'),
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

it('prefers the manually entered product seo metadata over the generated values', function () {
    $product = Product::factory()->create([
        'title' => 'Test Product',
        'description' => '<p>This is a great product for testing.</p>',
        'image_alt' => 'A pair of headphones on a desk',
        'seo_title' => 'Buy Test Product Online',
        'seo_description' => 'Hand-written snippet for search engines.',
        'in_stock' => true,
    ]);

    $response = $this->get('/products/'.$product->slug);

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Products/Show')
        ->where('seo.title', 'Buy Test Product Online - '.config('app.name'))
        ->where('seo.description', 'Hand-written snippet for search engines.')
        ->where('seo.imageAlt', 'A pair of headphones on a desk'),
    );
});

it('filters homepage sections by the search term', function () {
    $category = Category::factory()->create(['type' => ProductType::Digital]);

    Product::factory()->hasAttached($category)->create([
        'title' => 'Claude Subscription',
        'in_stock' => true,
    ]);
    Product::factory()->hasAttached($category)->create([
        'title' => 'Unrelated Widget',
        'in_stock' => true,
    ]);

    $response = $this->get(route('home', ['search' => 'Claude']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->has('sections.0.categories.0.products', 1)
        ->where('sections.0.categories.0.products.0.title', 'Claude Subscription'),
    );
});

it('filters an uncategorized product on a type page by the search term', function () {
    Product::factory()->create([
        'title' => 'Claude Subscription',
        'in_stock' => true,
    ]);
    Product::factory()->create([
        'title' => 'Unrelated Widget',
        'in_stock' => true,
    ]);

    $response = $this->get(route('digital-products.index', ['search' => 'Claude']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/DigitalProducts')
        ->has('uncategorizedProducts', 1)
        ->where('uncategorizedProducts.0.title', 'Claude Subscription'),
    );
});

it('filters categorized products on a type page by the search term', function () {
    $category = Category::factory()->create(['type' => ProductType::Physical]);

    Product::factory()->physical()->hasAttached($category)->create([
        'title' => 'Leather Wallet',
        'in_stock' => true,
    ]);
    Product::factory()->physical()->hasAttached($category)->create([
        'title' => 'Cotton Shirt',
        'in_stock' => true,
    ]);

    $response = $this->get(route('physical-products.index', ['search' => 'Wallet']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/PhysicalProducts')
        ->has('categories.0.products', 1)
        ->where('categories.0.products.0.title', 'Leather Wallet'),
    );
});

it('keeps the product type scope when searching a type page', function () {
    Product::factory()->create([
        'title' => 'Claude Subscription',
        'in_stock' => true,
    ]);
    Product::factory()->service()->create([
        'title' => 'Claude Setup Consulting',
        'in_stock' => true,
    ]);

    $response = $this->get(route('services.index', ['search' => 'Claude']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/Services')
        ->has('uncategorizedProducts', 1)
        ->where('uncategorizedProducts.0.title', 'Claude Setup Consulting'),
    );
});

it('returns no results on a type page when nothing matches the search term', function () {
    Product::factory()->create([
        'title' => 'Claude Subscription',
        'in_stock' => true,
    ]);

    $response = $this->get(route('digital-products.index', ['search' => 'nothing-matches-this']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/DigitalProducts')
        ->has('categories', 0)
        ->has('uncategorizedProducts', 0),
    );
});

it('does not issue more queries as more categories match the search', function () {
    $countQueriesForCategories = function (int $categoryCount): int {
        Category::query()->delete();
        Product::query()->delete();

        for ($i = 0; $i < $categoryCount; $i++) {
            $category = Category::factory()->create([
                'name' => "Claude Category {$i}",
                'type' => ProductType::Digital,
            ]);

            Product::factory()->count(3)->hasAttached($category)->create([
                'in_stock' => true,
            ]);
        }

        // Warm the shared-layout caches first; otherwise the very first request
        // of the test would be counted with extra one-off lookups.
        $this->get(route('digital-products.index', ['search' => 'Claude']))->assertSuccessful();

        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->get(route('digital-products.index', ['search' => 'Claude']))->assertSuccessful();

        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $queries;
    };

    // A category-count-dependent query total would mean the products relation is
    // being lazy-loaded per category rather than eager-loaded in one go.
    expect($countQueriesForCategories(6))->toBe($countQueriesForCategories(2));
});

it('echoes the active search term back to the type page', function () {
    $response = $this->get(route('digital-products.index', ['search' => 'Claude']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/DigitalProducts')
        ->where('filters.search', 'Claude'),
    );
});

it('echoes a null search term when the type page is unfiltered', function () {
    $response = $this->get(route('digital-products.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/DigitalProducts')
        ->where('filters.search', null),
    );
});

it('echoes the active search term back to the homepage', function () {
    $response = $this->get(route('home', ['search' => 'Claude']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('filters.search', 'Claude'),
    );
});

it('ignores a blank search term on a type page', function () {
    Product::factory()->create([
        'title' => 'Claude Subscription',
        'in_stock' => true,
    ]);

    $response = $this->get(route('digital-products.index', ['search' => '   ']));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Storefront/DigitalProducts')
        ->has('uncategorizedProducts', 1),
    );
});
