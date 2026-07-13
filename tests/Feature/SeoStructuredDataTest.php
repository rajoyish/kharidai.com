<?php

use App\Models\Category;
use App\Models\Post;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/**
 * Pull the server-rendered JSON-LD graph out of the document head, keyed by
 * schema `@type` so each test can assert on the node it cares about.
 *
 * @return array<string, array<string, mixed>>
 */
function schemaGraph(TestResponse $response): array
{
    $matched = preg_match(
        '/<script type="application\/ld\+json">(.*?)<\/script>/s',
        $response->getContent(),
        $matches,
    );

    if ($matched !== 1) {
        return [];
    }

    $decoded = json_decode(trim($matches[1]), true, 512, JSON_THROW_ON_ERROR);

    return collect($decoded['@graph'] ?? [])
        ->keyBy(fn (array $node): string => $node['@type'])
        ->all();
}

it('renders organization and website schema on the home page', function () {
    $graph = schemaGraph($this->get(route('home')));

    expect($graph)->toHaveKeys(['Organization', 'WebSite']);
    expect($graph['Organization']['name'])->toBe(config('app.name'));
    expect($graph['Organization']['url'])->toBe(route('home'));
    expect($graph['WebSite']['potentialAction']['@type'])->toBe('SearchAction');
});

it('renders a product schema with a single offer when one variant is priced', function () {
    $product = Product::factory()->physical()->create(['title' => 'Nepali Tea']);
    ProductVariant::factory()->for($product)->create([
        'price_npr' => 450.00,
        'show_pricing' => true,
    ]);

    $graph = schemaGraph($this->get(route('products.show', $product)));

    expect($graph['Product']['name'])->toBe('Nepali Tea');
    expect($graph['Product']['sku'])->toBe($product->slug);
    expect($graph['Product']['offers'])->toMatchArray([
        '@type' => 'Offer',
        'price' => 450.0,
        'priceCurrency' => 'NPR',
        'availability' => 'https://schema.org/InStock',
    ]);
});

it('aggregates the price range when several variants are priced', function () {
    $product = Product::factory()->physical()->create();
    ProductVariant::factory()->for($product)->create(['price_npr' => 100.00, 'show_pricing' => true]);
    ProductVariant::factory()->for($product)->create(['price_npr' => 900.00, 'show_pricing' => true]);

    $offers = schemaGraph($this->get(route('products.show', $product)))['Product']['offers'];

    expect($offers)->toMatchArray([
        '@type' => 'AggregateOffer',
        'lowPrice' => 100.0,
        'highPrice' => 900.0,
        'offerCount' => 2,
    ]);
});

it('never exposes per-variant digital pricing to guests in the schema', function () {
    $product = Product::factory()->create(['type' => 'digital']);
    ProductVariant::factory()->for($product)->create(['price_npr' => 250.00, 'show_pricing' => true]);
    ProductVariant::factory()->for($product)->create(['price_npr' => 800.00, 'show_pricing' => true]);

    $offers = schemaGraph($this->get(route('products.show', $product)))['Product']['offers'];

    // Guests only ever see the aggregate "starting" price, so the schema must
    // carry the low price without the individual variant prices behind it.
    expect($offers['@type'])->toBe('AggregateOffer');
    expect((float) $offers['lowPrice'])->toBe(250.0);
    expect($offers)->not->toHaveKey('highPrice');

    $signedIn = $this->actingAs(User::factory()->create())->get(route('products.show', $product));

    expect(schemaGraph($signedIn)['Product']['offers'])->toMatchArray([
        '@type' => 'AggregateOffer',
        'lowPrice' => 250.0,
        'highPrice' => 800.0,
    ]);
});

it('omits offers entirely when a product has no public price', function () {
    $product = Product::factory()->physical()->create();
    ProductVariant::factory()->for($product)->create([
        'price_npr' => 0.00,
        'show_pricing' => false,
    ]);

    // A fabricated `0.00` offer would be rejected by Google as invalid, so the
    // "price on request" case must emit no offers node at all.
    expect(schemaGraph($this->get(route('products.show', $product)))['Product'])
        ->not->toHaveKey('offers');
});

it('renders a breadcrumb trail down to the product', function () {
    $category = Category::factory()->create(['name' => 'Teas', 'type' => 'physical']);
    $product = Product::factory()->physical()->create(['title' => 'Nepali Tea']);
    $product->categories()->attach($category);
    ProductVariant::factory()->for($product)->create(['show_pricing' => true]);

    $crumbs = schemaGraph($this->get(route('products.show', $product)))['BreadcrumbList']['itemListElement'];

    expect(collect($crumbs)->pluck('name')->all())
        ->toBe(['Home', 'Physical Products', 'Teas', 'Nepali Tea']);
    expect($crumbs[0]['position'])->toBe(1);
    expect(end($crumbs)['item'])->toBe(route('products.show', $product));
});

it('renders blog posting schema with author, publisher and dates', function () {
    $author = User::factory()->create(['name' => 'Rajesh']);
    $post = Post::factory()->for($author, 'author')->create([
        'title' => 'Shopping in Nepal',
        'published_at' => now()->subDay(),
    ]);

    $graph = schemaGraph($this->get(route('blog.show', $post)));

    expect($graph['BlogPosting'])->toMatchArray([
        'headline' => 'Shopping in Nepal',
        'author' => ['@type' => 'Person', 'name' => 'Rajesh'],
    ]);
    expect($graph['BlogPosting']['datePublished'])->toBe($post->published_at->toAtomString());
    expect($graph['BlogPosting']['publisher']['@id'])->toBe(route('home').'#organization');
    expect(collect($graph['BreadcrumbList']['itemListElement'])->pluck('name')->all())
        ->toBe(['Home', 'Blog', 'Shopping in Nepal']);
});

it('escapes script-closing sequences that reach the schema from page content', function () {
    $product = Product::factory()->physical()->create([
        'title' => 'Safe</script><script>alert(1)</script>',
    ]);
    ProductVariant::factory()->for($product)->create(['show_pricing' => true]);

    $response = $this->get(route('products.show', $product));

    // The raw sequence must never survive into the document, or it would break
    // out of the ld+json block and execute.
    expect($response->getContent())->not->toContain('</script><script>alert(1)');
    expect(schemaGraph($response)['Product']['name'])->toBe($product->title);
});
