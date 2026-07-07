<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\PhysicalProductDetail;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Add a physical product to the given user's cart (creating the cart if needed).
 *
 * @param  array<string, mixed>  $detail
 */
function addPhysicalItem(User $user, float $priceNpr = 1000, int $quantity = 2, array $detail = []): ProductVariant
{
    $product = Product::factory()->physical()->create();
    PhysicalProductDetail::factory()->create([
        'product_id' => $product->id,
        'weight_kg' => 0.5,
        'free_shipping' => false,
        'flat_shipping_npr' => null,
        ...$detail,
    ]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'price_npr' => $priceNpr,
        'purchase_price_npr' => $priceNpr * 0.5,
    ]);

    $cart = Cart::firstOrCreate(['user_id' => $user->id]);
    CartItem::factory()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'quantity' => $quantity,
    ]);

    return $variant;
}

function addDigitalItem(User $user, float $priceNpr = 500): void
{
    $variant = ProductVariant::factory()->create([
        'product_id' => Product::factory()->create()->id,
        'price_npr' => $priceNpr,
    ]);
    $cart = Cart::firstOrCreate(['user_id' => $user->id]);
    CartItem::factory()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ]);
}

function activeZone(array $rate = []): ShippingZone
{
    $zone = ShippingZone::factory()->create(['is_active' => true]);
    ShippingRate::factory()->create([
        'shipping_zone_id' => $zone->id,
        'base_fee_npr' => 100,
        'per_kg_fee_npr' => 50,
        'free_over_npr' => null,
        ...$rate,
    ]);

    return $zone;
}

function shippingPayload(ShippingZone $zone, string $paymentOption = 'full'): array
{
    return [
        'shipping_zone_id' => $zone->id,
        'recipient_name' => 'Jane Doe',
        'primary_contact' => '9812345678',
        'address_line' => 'Baneshwor',
        'city' => 'Kathmandu',
        'payment_option' => $paymentOption,
    ];
}

beforeEach(function () {
    Notification::fake();
    $this->user = User::factory()->create();
});

it('requires a shipping address for physical carts', function () {
    addPhysicalItem($this->user);
    activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', ['payment_option' => 'full'])
        ->assertSessionHasErrors(['shipping_zone_id', 'recipient_name', 'address_line', 'city']);
});

it('computes the shipping fee and creates a shipment for a full payment', function () {
    addPhysicalItem($this->user, priceNpr: 1000, quantity: 2); // 2 packages x (base 100 + ceil(0.5)=1kg * 50) = 2 x 150 = 300
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'full'))
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    expect($order->items_total)->toBe(2000.0)
        ->and($order->shipping_total)->toBe(300.0)
        ->and((float) $order->total_amount)->toBe(2300.0)
        ->and($order->amount_due_now)->toBe(2300.0)
        ->and($order->balance_due)->toBe(0.0);

    $this->assertDatabaseHas('shipments', [
        'order_id' => $order->id,
        'recipient_name' => 'Jane Doe',
        'city' => 'Kathmandu',
        'status' => 'pending',
    ]);
});

it('collects only shipping now and the goods balance on delivery', function () {
    addPhysicalItem($this->user, priceNpr: 1000, quantity: 2);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'shipping_only'))
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    expect($order->payment_option->value)->toBe('shipping_only')
        ->and($order->amount_due_now)->toBe(300.0)
        ->and($order->balance_due)->toBe(2000.0);
});

it('rejects shipping-only when the cart is not physical-only', function () {
    addPhysicalItem($this->user, priceNpr: 1000, quantity: 1);
    addDigitalItem($this->user);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'shipping_only'))
        ->assertSessionHasErrors('payment_option');
});

it('saves the address when requested', function () {
    addPhysicalItem($this->user);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', [...shippingPayload($zone, 'full'), 'save_address' => true])
        ->assertRedirect();

    $this->assertDatabaseHas('shipping_addresses', [
        'user_id' => $this->user->id,
        'recipient_name' => 'Jane Doe',
        'is_default' => true,
    ]);
});

it('collects shipping plus the variant advance now for the advance option', function () {
    $variant = addPhysicalItem($this->user, priceNpr: 1000, quantity: 2); // 2 packages x 150 = 300 shipping
    $variant->update(['advance_payment_percent' => 30]); // 1000 * 30% = 300 per unit * 2 = 600
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'advance'))
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    expect($order->payment_option->value)->toBe('advance')
        ->and($order->amount_due_now)->toBe(900.0) // 300 shipping + 600 advance
        ->and($order->balance_due)->toBe(1400.0);  // 2000 items - 600 advance
});

it('rejects shipping-only when an item in the cart requires an advance payment', function () {
    $variant = addPhysicalItem($this->user, priceNpr: 1000, quantity: 1);
    $variant->update(['advance_payment_percent' => 30]);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'shipping_only'))
        ->assertSessionHasErrors('payment_option');
});

it('rejects the advance option when the cart is not physical-only', function () {
    addPhysicalItem($this->user, priceNpr: 1000, quantity: 1);
    addDigitalItem($this->user);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'advance'))
        ->assertSessionHasErrors('payment_option');
});

it('consolidates to a single number when the alternate matches the primary', function () {
    addPhysicalItem($this->user);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', [...shippingPayload($zone, 'full'), 'alternate_contact' => '+977 9812345678'])
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    $this->assertDatabaseHas('shipments', [
        'order_id' => $order->id,
        'mobile_number' => '9812345678',
    ]);
});

it('ships to the alternate contact number when it differs from the primary', function () {
    addPhysicalItem($this->user);
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', [...shippingPayload($zone, 'full'), 'alternate_contact' => '9801234567'])
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    $this->assertDatabaseHas('shipments', [
        'order_id' => $order->id,
        'mobile_number' => '9801234567',
    ]);
});

it('passes the items and advance totals to the checkout page', function () {
    $variant = addPhysicalItem($this->user, priceNpr: 1000, quantity: 2);
    $variant->update(['advance_payment_percent' => 30]); // 1000 * 30% = 300 per unit * 2 = 600
    activeZone();

    $this->actingAs($this->user)
        ->get('/checkout')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Checkout/Index')
            ->where('itemsTotal', 2000)
            ->where('advanceTotal', 600)
        );
});

it('still allows a digital-only checkout without shipping fields', function () {
    addDigitalItem($this->user, priceNpr: 500);

    $this->actingAs($this->user)
        ->post('/checkout', ['additional_data' => 'gift note'])
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    expect($order->shipping_total)->toBe(0.0)
        ->and($order->payment_option)->toBeNull();
    $this->assertDatabaseMissing('shipments', ['order_id' => $order->id]);
});
