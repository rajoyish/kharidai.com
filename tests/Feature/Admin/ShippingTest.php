<?php

use App\Models\Order;
use App\Models\Shipment;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('lists shipping zones', function () {
    ShippingZone::factory()->has(ShippingRate::factory(), 'rate')->count(2)->create();

    $this->actingAs($this->admin)->get('/admin/shipping')->assertSuccessful();
});

it('creates a zone with its rate', function () {
    $this->actingAs($this->admin)->post('/admin/shipping', [
        'name' => 'Inside Valley',
        'is_active' => true,
        'sort_order' => 0,
        'base_fee_npr' => 100,
        'per_kg_fee_npr' => 40,
        'parcel_capacity_kg' => 5,
        'free_over_npr' => 5000,
        'min_days' => 1,
        'max_days' => 2,
    ])->assertRedirect();

    $zone = ShippingZone::where('name', 'Inside Valley')->firstOrFail();

    expect($zone->rate)->not->toBeNull()
        ->and($zone->rate->base_fee_npr)->toBe(100.0)
        ->and($zone->rate->per_kg_fee_npr)->toBe(40.0)
        ->and((float) $zone->rate->parcel_capacity_kg)->toBe(5.0)
        ->and($zone->rate->free_over_npr)->toBe(5000.0);
});

it('updates a zone and its rate', function () {
    $zone = ShippingZone::factory()->has(ShippingRate::factory(), 'rate')->create(['name' => 'Old']);

    $this->actingAs($this->admin)->put("/admin/shipping/{$zone->id}", [
        'name' => 'New Name',
        'is_active' => false,
        'sort_order' => 3,
        'base_fee_npr' => 250,
        'per_kg_fee_npr' => 80,
    ])->assertRedirect();

    $zone->refresh();

    expect($zone->name)->toBe('New Name')
        ->and($zone->is_active)->toBeFalse()
        ->and($zone->rate->base_fee_npr)->toBe(250.0);
});

it('deletes a zone', function () {
    $zone = ShippingZone::factory()->has(ShippingRate::factory(), 'rate')->create();

    $this->actingAs($this->admin)->delete("/admin/shipping/{$zone->id}")->assertRedirect();

    $this->assertDatabaseMissing('shipping_zones', ['id' => $zone->id]);
});

it('updates a shipment status from the order', function () {
    $order = Order::factory()->create();
    $shipment = Shipment::factory()->create(['order_id' => $order->id, 'status' => 'pending']);

    $this->actingAs($this->admin)
        ->patch("/admin/orders/{$order->id}/shipment-status", ['status' => 'shipped'])
        ->assertRedirect();

    expect($shipment->refresh()->status)->toBe('shipped');
});

it('marks the delivery balance as paid', function () {
    $order = Order::factory()->create(['balance_due' => 200000]);

    $this->actingAs($this->admin)
        ->patch("/admin/orders/{$order->id}/mark-balance-paid")
        ->assertRedirect();

    expect($order->refresh()->balance_due)->toBe(0.0);
});
