<?php

use App\Models\ShippingAddress;
use App\Models\ShippingZone;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('lists the saved addresses for the user', function () {
    ShippingAddress::factory()->count(2)->create(['user_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->get(route('account.addresses.index'))
        ->assertSuccessful();
});

it('updates a saved address', function () {
    $zone = ShippingZone::factory()->create(['is_active' => true]);
    $address = ShippingAddress::factory()->create(['user_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->put(route('account.addresses.update', $address), [
            'recipient_name' => 'Updated Name',
            'mobile_number' => '9812345678',
            'address_line' => 'New Street',
            'city' => 'Pokhara',
            'landmark' => 'Near the lake',
            'shipping_zone_id' => $zone->id,
        ])
        ->assertRedirect(route('account.addresses.index'));

    $this->assertDatabaseHas('shipping_addresses', [
        'id' => $address->id,
        'recipient_name' => 'Updated Name',
        'city' => 'Pokhara',
        'shipping_zone_id' => $zone->id,
    ]);
});

it('promotes an address to the default, demoting the previous default', function () {
    $current = ShippingAddress::factory()->create(['user_id' => $this->user->id, 'is_default' => true]);
    $other = ShippingAddress::factory()->create(['user_id' => $this->user->id, 'is_default' => false]);

    $this->actingAs($this->user)
        ->patch(route('account.addresses.default', $other))
        ->assertRedirect(route('account.addresses.index'));

    expect($current->refresh()->is_default)->toBeFalse()
        ->and($other->refresh()->is_default)->toBeTrue();
});

it('deletes a saved address', function () {
    $address = ShippingAddress::factory()->create(['user_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->delete(route('account.addresses.destroy', $address))
        ->assertRedirect(route('account.addresses.index'));

    $this->assertDatabaseMissing('shipping_addresses', ['id' => $address->id]);
});

it('forbids updating an address owned by another user', function () {
    $address = ShippingAddress::factory()->create(['user_id' => User::factory()->create()->id]);

    $this->actingAs($this->user)
        ->put(route('account.addresses.update', $address), [
            'recipient_name' => 'Hacker',
            'mobile_number' => '9812345678',
            'address_line' => 'Somewhere',
            'city' => 'Kathmandu',
        ])
        ->assertForbidden();
});
