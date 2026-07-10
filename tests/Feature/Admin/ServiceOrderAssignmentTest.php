<?php

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->customer = User::factory()->create();
});

it('creates a payable order from the saved invoice and links it', function () {
    $variant = ProductVariant::factory()->create();
    $engagement = ServiceEngagement::factory()->create([
        'user_id' => $this->customer->id,
        'product_variant_id' => $variant->id,
        'order_item_id' => null,
        'line_items' => [['label' => 'Design', 'quantity' => 2, 'unit_price_npr' => 5000]],
        'tax_rate' => 13,
        'advance_paid_npr' => 4000,
        'agreed_price_npr' => 11300,
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/assign-order")
        ->assertRedirect();

    $engagement->refresh();
    expect($engagement->order_item_id)->not->toBeNull();

    $order = $engagement->orderItem->order;
    expect($order->user_id)->toBe($this->customer->id)
        ->and($order->status)->toBe('pending')
        ->and((float) $order->total_amount)->toBe(11300.0)
        ->and((float) $order->amount_due_now)->toBe(7300.0)
        ->and((float) $engagement->orderItem->price)->toBe(11300.0)
        ->and($engagement->orderItem->product_variant_id)->toBe($variant->id);
});

it('will not assign an order before the invoice is saved', function () {
    $engagement = ServiceEngagement::factory()->create([
        'user_id' => $this->customer->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'order_item_id' => null,
        'line_items' => null,
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/assign-order")
        ->assertRedirect();

    expect($engagement->refresh()->order_item_id)->toBeNull();
    expect(Order::count())->toBe(0);
});

it('will not assign a second order once linked', function () {
    $existing = Order::factory()->create(['user_id' => $this->customer->id]);
    $existingItem = $existing->items()->create([
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 5000,
        'quantity' => 1,
    ]);

    $engagement = ServiceEngagement::factory()->create([
        'user_id' => $this->customer->id,
        'order_item_id' => $existingItem->id,
        'line_items' => [['label' => 'Design', 'quantity' => 1, 'unit_price_npr' => 5000]],
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/assign-order")
        ->assertRedirect();

    expect($engagement->refresh()->order_item_id)->toBe($existingItem->id);
    expect(Order::count())->toBe(1);
});

// Linking an engagement to an order the customer already placed was removed:
// storefront service purchases already create their engagement attached to the
// order item, so the only orders on offer were unrelated products.
it('no longer exposes a link-order route', function () {
    $engagement = ServiceEngagement::factory()->create([
        'user_id' => $this->customer->id,
        'order_item_id' => null,
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/link-order", ['order_item_id' => 1])
        ->assertNotFound();
});
