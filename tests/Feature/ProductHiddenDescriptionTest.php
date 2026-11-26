<?php

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('strips the hidden description from the product page payload for guests', function () {
    $product = Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Members-only download instructions',
    ]);

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->missing('product.hidden_description'),
        )
        ->assertDontSee('Members-only download instructions');
});

it('exposes the hidden description to authenticated users on the product page', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Members-only download instructions',
    ]);

    $this->actingAs($user)
        ->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.hidden_description', 'Members-only download instructions'),
        );
});

it('never serializes the hidden description on storefront listing pages', function () {
    Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Members-only download instructions',
    ]);

    $this->get(route('digital-products.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->missing('uncategorizedProducts.0.hidden_description'),
        )
        ->assertDontSee('Members-only download instructions');
});

it('stores the hidden description when an admin creates a digital product', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)->post('/admin/products', [
        'type' => 'digital',
        'title' => 'Digital Product',
        'description' => 'Public description',
        'hidden_description' => '<p>Secret content</p>',
        'in_stock' => true,
        'is_visible' => true,
    ])->assertRedirect('/admin/products');

    expect(Product::firstWhere('title', 'Digital Product')->hidden_description)
        ->toBe('<p>Secret content</p>');
});

it('updates the hidden description when an admin edits a digital product', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['hidden_description' => '<p>Old secret</p>']);

    $this->actingAs($admin)->put("/admin/products/{$product->slug}", [
        'type' => 'digital',
        'title' => $product->title,
        'description' => $product->description,
        'hidden_description' => '<p>New secret</p>',
        'in_stock' => true,
        'is_visible' => true,
    ])->assertRedirect('/admin/products');

    expect($product->fresh()->hidden_description)->toBe('<p>New secret</p>');
});

it('discards the hidden description when a product is saved as a non-digital type', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['hidden_description' => '<p>Secret</p>']);

    $this->actingAs($admin)->put("/admin/products/{$product->slug}", [
        'type' => 'physical',
        'title' => $product->title,
        'description' => $product->description,
        'hidden_description' => '<p>Secret</p>',
        'in_stock' => true,
        'is_visible' => true,
    ])->assertRedirect('/admin/products');

    expect($product->fresh()->hidden_description)->toBeNull();
});

it('exposes the hidden description on the admin edit page so the form can populate', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['hidden_description' => '<p>Secret</p>']);

    $this->actingAs($admin)
        ->get("/admin/products/{$product->slug}/edit")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.hidden_description', '<p>Secret</p>'),
        );
});

it('sends each variant\'s own members-only details to signed-in viewers only', function () {
    $product = Product::factory()->create([
        'in_stock' => true,
        'hidden_description' => 'Product-wide warranty',
    ]);
    ProductVariant::factory()->for($product)->create(['name' => '12 Months', 'hidden_description' => '12-month warranty terms']);
    ProductVariant::factory()->for($product)->create(['name' => '6 Months', 'hidden_description' => null]);

    $this->actingAs(User::factory()->create())
        ->get(route('products.show', $product))
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.hidden_description', 'Product-wide warranty')
            ->where('product.variants.0.hidden_description', '12-month warranty terms')
            ->where('product.variants.1.hidden_description', null),
        );

    auth()->logout();

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertDontSee('12-month warranty terms');
});

it('keeps variant members-only details out of public variant payloads', function () {
    $product = Product::factory()->physical()->create(['in_stock' => true]);
    // Saved directly: the admin form would refuse it for a physical product.
    ProductVariant::factory()->for($product)->create()->forceFill(['hidden_description' => 'Secret terms'])->saveQuietly();

    $this->get(route('products.show', $product))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('product.variants.0.name')
            ->missing('product.variants.0.hidden_description'),
        )
        ->assertDontSee('Secret terms');
});

it('stores a variant\'s members-only details, and none when the editor is left empty', function (string $submitted, ?string $stored) {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();

    $this->actingAs($admin)->post(route('admin.products.variants.store', $product), [
        'name' => '12 Months',
        'price_npr' => 999,
        'hidden_description' => $submitted,
    ])->assertRedirect(route('admin.products.variants.index', $product));

    expect($product->variants()->sole()->hidden_description)->toBe($stored);
})->with([
    'own details' => ['<p>12-month warranty</p>', '<p>12-month warranty</p>'],
    'emptied editor' => ['<p></p>', null],
    'whitespace only' => ['<p>&nbsp; </p>', null],
]);

it('discards variant members-only details on non-digital products', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->physical()->create();
    $variant = ProductVariant::factory()->for($product)->create();

    $this->actingAs($admin)->patch(route('admin.products.variants.update', [$product, $variant]), [
        'name' => $variant->name,
        'price_npr' => 500,
        'hidden_description' => '<p>Secret</p>',
    ])->assertRedirect(route('admin.products.variants.index', $product));

    expect($variant->fresh()->hidden_description)->toBeNull();
});

it('exposes a variant\'s members-only details on its admin edit page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $variant = ProductVariant::factory()->create(['hidden_description' => '<p>Variant secret</p>']);

    $this->actingAs($admin)
        ->get(route('admin.products.variants.edit', [$variant->product, $variant]))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('variant.hidden_description', '<p>Variant secret</p>'),
        );
});
