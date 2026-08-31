<?php

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('lists the payment methods in display order', function () {
    $response = $this->actingAs($this->admin)->get('/admin/payment-methods');

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/PaymentMethods/Index')
        ->has('paymentMethods', 3)
        ->where('paymentMethods.0.key', 'default')
        ->where('paymentMethods.1.key', 'esewa')
        ->where('paymentMethods.2.key', 'khalti')
        ->where('paymentMethods.0.is_enabled', true),
    );
});

it('takes a payment method out of service', function () {
    $esewa = PaymentMethod::query()->where('key', 'esewa')->firstOrFail();

    $this->actingAs($this->admin)
        ->from('/admin/payment-methods')
        ->patch("/admin/payment-methods/{$esewa->id}", ['is_enabled' => false])
        ->assertRedirect('/admin/payment-methods');

    expect($esewa->fresh()->is_enabled)->toBeFalse();
});

it('rejects a toggle without a boolean state', function () {
    $esewa = PaymentMethod::query()->where('key', 'esewa')->firstOrFail();

    $this->actingAs($this->admin)
        ->patch("/admin/payment-methods/{$esewa->id}", ['is_enabled' => 'maybe'])
        ->assertSessionHasErrors('is_enabled');

    expect($esewa->fresh()->is_enabled)->toBeTrue();
});

it('keeps non-admins away from the payment method switches', function () {
    $customer = User::factory()->create();
    $esewa = PaymentMethod::query()->where('key', 'esewa')->firstOrFail();

    $this->actingAs($customer)->get('/admin/payment-methods')->assertForbidden();
    $this->actingAs($customer)
        ->patch("/admin/payment-methods/{$esewa->id}", ['is_enabled' => false])
        ->assertForbidden();

    expect($esewa->fresh()->is_enabled)->toBeTrue();
});

it('shares which payment methods are in service with customer-facing pages', function () {
    PaymentMethod::query()->where('key', 'khalti')->update(['is_enabled' => false]);

    $customer = User::factory()->create();
    $order = Order::factory()->create([
        'user_id' => $customer->id,
        'status' => 'pending',
    ]);

    // Both QR-bearing pages read the same shared prop, so the panel greys out
    // the same provider on each.
    foreach (["/checkout/{$order->id}/npr", "/orders/{$order->id}"] as $url) {
        $this->actingAs($customer)->get($url)->assertInertia(fn (Assert $page) => $page
            ->where('paymentMethods.0.key', 'default')
            ->where('paymentMethods.0.is_enabled', true)
            ->where('paymentMethods.2.key', 'khalti')
            ->where('paymentMethods.2.is_enabled', false),
        );
    }
});

it('reflects a flipped switch in the shared list straight away', function () {
    expect(collect(PaymentMethod::shared())->firstWhere('key', 'esewa')['is_enabled'])->toBeTrue();

    $esewa = PaymentMethod::query()->where('key', 'esewa')->firstOrFail();

    $this->actingAs($this->admin)
        ->patch("/admin/payment-methods/{$esewa->id}", ['is_enabled' => false]);

    expect(collect(PaymentMethod::shared())->firstWhere('key', 'esewa')['is_enabled'])->toBeFalse();
});
