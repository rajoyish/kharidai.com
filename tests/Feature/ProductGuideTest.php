<?php

use App\Enums\ProductType;
use App\Models\Product;
use App\Models\ProductGuide;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

it('shows a published guide to the buyer on a paid order', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->create([
        'product_id' => $product->id,
        'title' => 'How to activate',
        'content' => '<p>Step one</p>',
    ]);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $product)))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.delivery_guides.0.title', 'How to activate')
            ->where('order.items.0.delivery_guides.0.content', '<p>Step one</p>'),
        );
});

it('serves the same guide to every buyer of the product', function () {
    $product = Product::factory()->create();
    ProductGuide::factory()->create(['product_id' => $product->id, 'title' => 'Shared steps']);

    foreach (User::factory()->count(2)->create() as $buyer) {
        $this->actingAs($buyer)
            ->get(route('orders.show', orderFor($buyer, $product)))
            ->assertSuccessful()
            ->assertInertia(fn (Assert $page) => $page
                ->where('order.items.0.delivery_guides.0.title', 'Shared steps'),
            );
    }
});

it('withholds the guide until the order is paid for', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->create([
        'product_id' => $product->id,
        'content' => '<p>Secret setup steps</p>',
    ]);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $product, status: 'pending')))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page->where('order.items.0.delivery_guides', []))
        ->assertDontSee('Secret setup steps');
});

it('releases the guide once the payment receipt is approved', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->create(['product_id' => $product->id, 'title' => 'How to activate']);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $product, status: 'delivering')))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.delivery_guides.0.title', 'How to activate'),
        );
});

it('never sends a draft guide to the buyer', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->draft()->create([
        'product_id' => $product->id,
        'content' => '<p>Unfinished draft</p>',
    ]);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $product)))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page->where('order.items.0.delivery_guides', []))
        ->assertDontSee('Unfinished draft');
});

it('sends only the guides for products the order actually holds', function () {
    $buyer = User::factory()->create();
    $bought = Product::factory()->create();
    $notBought = Product::factory()->create();

    ProductGuide::factory()->create(['product_id' => $bought->id, 'title' => 'Bought guide']);
    ProductGuide::factory()->create([
        'product_id' => $notBought->id,
        'content' => '<p>Guide for a product they never bought</p>',
    ]);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $bought)))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('order.items.0.delivery_guides', 1)
            ->where('order.items.0.delivery_guides.0.title', 'Bought guide'),
        )
        ->assertDontSee('Guide for a product they never bought');
});

it('refuses the order page to someone who did not place the order', function () {
    $buyer = User::factory()->create();
    $stranger = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->create(['product_id' => $product->id, 'content' => '<p>Paid steps</p>']);

    $this->actingAs($stranger)
        ->get(route('orders.show', orderFor($buyer, $product)))
        ->assertForbidden()
        ->assertDontSee('Paid steps');
});

it('orders guides by the admin sort order', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->create(['product_id' => $product->id, 'title' => 'Second', 'sort_order' => 2]);
    ProductGuide::factory()->create(['product_id' => $product->id, 'title' => 'First', 'sort_order' => 1]);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $product)))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.delivery_guides.0.title', 'First')
            ->where('order.items.0.delivery_guides.1.title', 'Second'),
        );
});

it('gives a physical product guides too', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->physical()->create();
    ProductGuide::factory()->create(['product_id' => $product->id, 'title' => 'How to assemble it']);

    $this->actingAs($buyer)
        ->get(route('orders.show', orderFor($buyer, $product)))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.delivery_guides.0.title', 'How to assemble it'),
        );
});

it('offers no guide authoring for a service', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $service = Product::factory()->service()->create();

    $this->actingAs($admin)->get(route('admin.products.guides.index', $service))->assertNotFound();
    $this->actingAs($admin)->get(route('admin.products.guides.create', $service))->assertNotFound();

    $this->actingAs($admin)
        ->post(route('admin.products.guides.store', $service), [
            'title' => 'Should not exist',
            'is_published' => true,
        ])
        ->assertNotFound();

    expect(ProductGuide::count())->toBe(0);
});

it('stops delivering a guide once its product becomes a service', function () {
    $buyer = User::factory()->create();
    $product = Product::factory()->create();
    ProductGuide::factory()->create([
        'product_id' => $product->id,
        'content' => '<p>Steps from when this was a digital product</p>',
    ]);
    $order = orderFor($buyer, $product);

    $this->actingAs($buyer)
        ->get(route('orders.show', $order))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page->has('order.items.0.delivery_guides', 1));

    $product->update(['type' => ProductType::Service]);

    // The rows survive the conversion — converting back restores them — but
    // nothing is delivered while the product is a service.
    expect(ProductGuide::count())->toBe(1);

    $this->actingAs($buyer)
        ->get(route('orders.show', $order))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page->where('order.items.0.delivery_guides', []))
        ->assertDontSee('Steps from when this was a digital product');
});

it('registers no public route that can serve a guide', function () {
    $adminOnly = collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($route): bool => str_contains((string) $route->getName(), 'guides'))
        ->every(fn ($route): bool => str_starts_with($route->uri(), 'admin/'));

    expect($adminOnly)->toBeTrue();
});

it('shows drafts to an admin reviewing the order', function () {
    $buyer = User::factory()->create();
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();
    ProductGuide::factory()->draft()->create(['product_id' => $product->id, 'title' => 'Work in progress']);

    $this->actingAs($admin)
        ->get(route('admin.orders.show', orderFor($buyer, $product, status: 'pending')))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.delivery_guides.0.title', 'Work in progress')
            ->where('order.items.0.delivery_guides.0.is_published', false),
        );
});

it('creates a guide from the admin form', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.products.guides.store', $product), [
            'title' => 'How to activate',
            'content' => '<p>Step one</p>',
            'is_published' => true,
            'sort_order' => 1,
        ])
        ->assertRedirect(route('admin.products.guides.index', $product));

    expect($product->guides()->first())
        ->title->toBe('How to activate')
        ->content->toBe('<p>Step one</p>')
        ->is_published->toBeTrue();
});

it('updates a guide from the admin form', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();
    $guide = ProductGuide::factory()->create(['product_id' => $product->id]);

    $this->actingAs($admin)
        ->put(route('admin.products.guides.update', [$product, $guide]), [
            'title' => 'Revised title',
            'content' => '<p>Revised steps</p>',
            'is_published' => false,
        ])
        ->assertRedirect(route('admin.products.guides.index', $product));

    expect($guide->fresh())
        ->title->toBe('Revised title')
        ->is_published->toBeFalse();
});

it('rejects a guide id that belongs to another product', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();
    $otherProduct = Product::factory()->create();
    $guide = ProductGuide::factory()->create(['product_id' => $otherProduct->id]);

    $this->actingAs($admin)
        ->get(route('admin.products.guides.edit', [$product, $guide]))
        ->assertNotFound();
});

it('keeps guide authoring away from non-admins', function () {
    $product = Product::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('admin.products.guides.index', $product))
        ->assertForbidden();
});

it('deletes a product\'s guides along with the product', function () {
    $product = Product::factory()->create();
    $guide = ProductGuide::factory()->create(['product_id' => $product->id]);

    $product->delete();

    expect(ProductGuide::find($guide->id))->toBeNull();
});
