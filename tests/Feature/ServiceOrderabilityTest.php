<?php

use App\Enums\ProductType;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\ServiceDetail;
use App\Models\ServiceEngagement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('provisions a default orderable variant for a variant-less service', function () {
    $service = Product::factory()->service()->create();

    expect($service->variants()->count())->toBe(0);

    $service->ensureOrderableVariant();

    expect($service->variants()->count())->toBe(1)
        ->and($service->variants()->first()->name)->toBe('Standard')
        ->and((float) $service->variants()->first()->price_npr)->toBe(0.0);
});

it('does not overwrite an existing variant when ensuring orderability', function () {
    $service = Product::factory()->service()->create();
    $service->variants()->create(['name' => 'Premium', 'price_npr' => 9000, 'purchase_price_npr' => 0]);

    $service->ensureOrderableVariant();

    expect($service->variants()->count())->toBe(1)
        ->and($service->variants()->first()->name)->toBe('Premium');
});

it('lets an authenticated user add a price-on-request service to the cart and place the order', function () {
    $user = User::factory()->create();

    $service = Product::factory()->service()->create(['type' => ProductType::Service]);
    ServiceDetail::factory()->create(['product_id' => $service->id, 'requires_brief' => true]);
    $service->ensureOrderableVariant();
    $variant = $service->variants()->first();

    // Add to cart via the storefront endpoint, including the required brief.
    $this->actingAs($user)
        ->post('/cart', [
            'product_variant_id' => $variant->id,
            'quantity' => 1,
            'brief' => 'Modern minimalist logo',
        ])
        ->assertRedirect();

    expect(Cart::where('user_id', $user->id)->first()->items()->count())->toBe(1);

    // Place the order (service-only cart needs no shipping details).
    $this->actingAs($user)
        ->post('/checkout', ['additional_data' => ''])
        ->assertRedirect();

    $engagement = ServiceEngagement::where('user_id', $user->id)->firstOrFail();

    expect($engagement->product_id)->toBe($service->id)
        ->and($engagement->brief)->toBe(['note' => 'Modern minimalist logo']);
});

it('carries the service requirements onto the order item and both order views', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['is_admin' => true]);

    $service = Product::factory()->service()->create();
    ServiceDetail::factory()->create(['product_id' => $service->id, 'requires_brief' => true]);
    $service->ensureOrderableVariant();
    $variant = $service->variants()->first();

    $this->actingAs($user)->post('/cart', [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'brief' => 'Modern minimalist logo',
    ])->assertRedirect();

    $this->actingAs($user)->post('/checkout', ['additional_data' => ''])->assertRedirect();

    $order = Order::where('user_id', $user->id)->firstOrFail();

    expect($order->items()->first()->brief)->toBe(['note' => 'Modern minimalist logo']);

    // The customer's order view surfaces the requirements.
    $this->actingAs($user)
        ->get(route('orders.show', $order))
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.brief.note', 'Modern minimalist logo')
        );

    // The admin's order management view surfaces the same requirements.
    $this->actingAs($admin)
        ->get("/admin/orders/{$order->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.brief.note', 'Modern minimalist logo')
        );
});
