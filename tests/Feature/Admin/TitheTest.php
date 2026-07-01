<?php

use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->user = User::factory()->create();
});

it('groups completed order profit into monthly tithes by month', function () {
    $julyFirstOrder = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-07-10 10:00:00',
    ]);
    $julySecondOrder = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-07-22 10:00:00',
    ]);
    $augustOrder = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-08-01 10:00:00',
    ]);

    $variant = ProductVariant::factory()->create();

    OrderItem::create([
        'order_id' => $julyFirstOrder->id,
        'product_variant_id' => $variant->id,
        'price' => 1000,
        'purchase_price' => 600,
        'quantity' => 2,
    ]);
    OrderItem::create([
        'order_id' => $julySecondOrder->id,
        'product_variant_id' => $variant->id,
        'price' => 500,
        'purchase_price' => 300,
        'quantity' => 1,
    ]);
    OrderItem::create([
        'order_id' => $augustOrder->id,
        'product_variant_id' => $variant->id,
        'price' => 900,
        'purchase_price' => 600,
        'quantity' => 1,
    ]);

    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $julyFirstOrder), [
        'status' => 'completed',
    ])->assertRedirect();
    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $julySecondOrder), [
        'status' => 'completed',
    ])->assertRedirect();
    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $augustOrder), [
        'status' => 'completed',
    ])->assertRedirect();

    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
        'total_amount' => 10000,
    ]);
    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 8,
        'total_amount' => 3000,
    ]);
});

it('removes a monthly tithe when the last completed order for that month is reverted', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-07-18 10:00:00',
    ]);
    $variant = ProductVariant::factory()->create();

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1200,
        'purchase_price' => 700,
        'quantity' => 1,
    ]);

    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $order), [
        'status' => 'completed',
    ])->assertRedirect();

    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
        'total_amount' => 5000,
    ]);

    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $order), [
        'status' => 'pending',
    ])->assertRedirect();

    $this->assertDatabaseMissing('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
    ]);
});

it('allows admins to view and toggle monthly tithes', function () {
    $monthlyTithe = MonthlyTithe::factory()->create([
        'month' => 7,
        'year' => 2026,
        'total_amount' => 125.5,
        'is_paid' => false,
        'paid_at' => null,
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.tithes.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Tithes/Index')
        ->has('tithes', 1)
        ->where('tithes.0.id', $monthlyTithe->id)
        ->where('tithes.0.total_amount', 125.5)
        ->where('tithes.0.total_profit', 1255)
        ->where('tithes.0.is_paid', false)
    );

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    expect($monthlyTithe->fresh())
        ->is_paid->toBeTrue()
        ->paid_at->not->toBeNull();

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    expect($monthlyTithe->fresh())
        ->is_paid->toBeFalse()
        ->paid_at->toBeNull();
});

it('prevents non-admins from accessing tithe management', function () {
    $monthlyTithe = MonthlyTithe::factory()->create();

    $this->actingAs($this->user)
        ->get(route('admin.tithes.index'))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertForbidden();
});

it('shows tithe stats on the admin dashboard', function () {
    MonthlyTithe::factory()->create([
        'month' => 1,
        'year' => 2026,
        'total_amount' => 120.25,
        'is_paid' => true,
        'paid_at' => now(),
    ]);
    MonthlyTithe::factory()->create([
        'month' => 2,
        'year' => 2026,
        'total_amount' => 49.75,
        'is_paid' => false,
        'paid_at' => null,
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->where('stats.total_tithes_collected_npr', 120.25)
        ->where('stats.pending_tithes_npr', 49.75)
    );
});
