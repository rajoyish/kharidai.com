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
        'weight_grams' => 500,
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
        'mobile_number' => '9812345678',
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
    addPhysicalItem($this->user, priceNpr: 1000, quantity: 2); // 2x500g = 1kg -> 50 + base 100 = 150
    $zone = activeZone();

    $this->actingAs($this->user)
        ->post('/checkout', shippingPayload($zone, 'full'))
        ->assertRedirect();

    $order = $this->user->orders()->firstOrFail();

    expect($order->items_total)->toBe(2000.0)
        ->and($order->shipping_total)->toBe(150.0)
        ->and((float) $order->total_amount)->toBe(2150.0)
        ->and($order->amount_due_now)->toBe(2150.0)
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
        ->and($order->amount_due_now)->toBe(150.0)
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
