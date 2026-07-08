<?php

use App\Enums\AdvanceType;
use App\Models\Order;
use App\Models\Product;
use App\Models\ServiceDetail;
use App\Models\User;
use Database\Factories\ServiceDetailFactory;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->user = User::factory()->create();
    Notification::fake();
});

/**
 * Add a free service (zero-price "Standard" variant) to the acting user's cart.
 */
function addFreeServiceToCart(User $user, ?ServiceDetailFactory $detail = null): Product
{
    $service = Product::factory()->service()->create();

    ($detail ?? ServiceDetail::factory())->create(['product_id' => $service->id]);

    $service->ensureOrderableVariant();

    test()->actingAs($user)
        ->post('/cart', [
            'product_variant_id' => $service->variants()->first()->id,
            'quantity' => 1,
        ])
        ->assertRedirect();

    return $service;
}

it('flags a free service-only cart as directly checkoutable', function () {
    addFreeServiceToCart($this->user);

    $this->actingAs($this->user)
        ->get('/cart')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Cart/Index')
            ->where('canCheckoutDirectly', true)
        );
});

it('does not flag a physical cart as directly checkoutable', function () {
    $product = Product::factory()->create(); // physical by default
    $variant = $product->variants()->create([
        'name' => 'Standard',
        'price_npr' => 2000,
        'purchase_price_npr' => 0,
    ]);

    $this->actingAs($this->user)->post('/cart', [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ])->assertRedirect();

    $this->actingAs($this->user)
        ->get('/cart')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Cart/Index')
            ->where('canCheckoutDirectly', false)
        );
});

it('places a free service order and skips the QR page when nothing is due', function () {
    addFreeServiceToCart($this->user);

    $response = $this->actingAs($this->user)->post('/checkout', ['additional_data' => '']);

    $order = Order::where('user_id', $this->user->id)->firstOrFail();

    expect((float) $order->amount_due_now)->toBe(0.0);
    $response->assertRedirect(route('orders.show', $order));
});

it('shows the QR page for a free service when a fixed advance is set', function () {
    $detail = ServiceDetail::factory()->requiringAdvance(AdvanceType::Fixed, 5000);

    addFreeServiceToCart($this->user, $detail);

    $response = $this->actingAs($this->user)->post('/checkout', ['additional_data' => '']);

    $order = Order::where('user_id', $this->user->id)->firstOrFail();

    expect((float) $order->amount_due_now)->toBe(5000.0);
    $response->assertRedirect(route('checkout.npr', $order));
});
