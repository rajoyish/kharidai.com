<?php

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\PricingStrategy;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceDetail;
use App\Models\ServiceEngagement;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    $this->user = User::factory()->create();
});

function serviceCartItem(User $user, int $quantity = 1, ?array $brief = null): CartItem
{
    $product = Product::factory()->service()->create();
    ServiceDetail::factory()->perHour(1200)->create(['product_id' => $product->id]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'price_npr' => 5000,
        'purchase_price_npr' => 2000,
    ]);

    $cart = Cart::firstOrCreate(['user_id' => $user->id]);

    return CartItem::factory()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'quantity' => $quantity,
        'brief' => $brief,
    ]);
}

it('spawns a pending engagement per unit when a service is checked out', function () {
    serviceCartItem($this->user, quantity: 2, brief: ['note' => 'design a logo']);

    $this->actingAs($this->user)
        ->post('/checkout', ['additional_data' => null])
        ->assertRedirect();

    $engagements = ServiceEngagement::where('user_id', $this->user->id)->get();

    expect($engagements)->toHaveCount(2)
        ->and($engagements->first()->source)->toBe(EngagementSource::Storefront)
        ->and($engagements->first()->status)->toBe(EngagementStatus::InProgress)
        ->and($engagements->first()->pricing_strategy)->toBe(PricingStrategy::PerHour)
        ->and($engagements->first()->pricing_config)->toBe(['hourly_rate_npr' => 1200])
        ->and($engagements->first()->price_npr)->toBe(5000.0)
        ->and($engagements->first()->brief)->toBe(['note' => 'design a logo'])
        ->and($engagements->first()->order_item_id)->not->toBeNull();
});

it('does not spawn engagements for non-service items', function () {
    $product = Product::factory()->create(); // digital
    $variant = ProductVariant::factory()->create(['product_id' => $product->id]);
    $cart = Cart::firstOrCreate(['user_id' => $this->user->id]);
    CartItem::factory()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ]);

    $this->actingAs($this->user)->post('/checkout', ['additional_data' => null])->assertRedirect();

    expect(ServiceEngagement::count())->toBe(0);
});

it('lets a user view their services', function () {
    ServiceEngagement::factory()->count(2)->create(['user_id' => $this->user->id]);

    $this->actingAs($this->user)->get('/account/services')->assertSuccessful();
});

it('exposes invoice totals and the linked order to the services page', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $variant = ProductVariant::factory()->create();
    $orderItem = $order->items()->create([
        'product_variant_id' => $variant->id,
        'price' => 5000,
        'quantity' => 1,
    ]);

    $engagement = ServiceEngagement::factory()->create([
        'user_id' => $this->user->id,
        'order_item_id' => $orderItem->id,
        'project_name' => 'Brand Refresh',
        'line_items' => [['label' => 'Design', 'quantity' => 2, 'unit_price_npr' => 5000]],
        'tax_rate' => 13,
        'advance_paid_npr' => 4000,
        'agreed_price_npr' => 11300,
        'is_paid' => false,
    ]);

    $this->actingAs($this->user)
        ->get('/account/services')
        ->assertInertia(fn ($page) => $page
            ->component('User/Services/Index')
            ->where('engagements.0.id', $engagement->id)
            ->where('engagements.0.project_name', 'Brand Refresh')
            ->where('engagements.0.payment_status', 'due')
            ->where('engagements.0.total_npr', 11300)
            ->where('engagements.0.due_npr', 7300)
            ->where('engagements.0.order_id', $order->id)
            ->where('engagements.0.order_number', $order->order_number)
        );
});

it('captures the brief when adding a service to the cart', function () {
    $product = Product::factory()->service()->create();
    $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

    $this->actingAs($this->user)->post(route('cart.add'), [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'brief' => 'Please match my brand colors.',
    ])->assertRedirect();

    $this->assertDatabaseHas('cart_items', [
        'product_variant_id' => $variant->id,
    ]);
    expect(CartItem::first()->brief)->toBe(['note' => 'Please match my brand colors.']);
});
