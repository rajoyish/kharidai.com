<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->customer = User::factory()->create();
    $this->order = Order::factory()->create(['user_id' => $this->customer->id, 'status' => 'completed']);

    OrderItem::create([
        'order_id' => $this->order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);
});

it('never sends the shop margin or cost price with the customer order list', function () {
    $this->actingAs($this->customer)
        ->get(route('orders.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->missing('orders.data.0.profit')
            ->missing('orders.data.0.items.0.purchase_price')
            ->has('orders.data.0.items.0.price'),
        );
});

it('never sends the shop margin or cost price with the customer order page', function () {
    $this->actingAs($this->customer)
        ->get(route('orders.show', $this->order))
        ->assertInertia(fn (Assert $page) => $page
            ->missing('order.profit')
            ->missing('order.items.0.purchase_price')
            ->has('order.items.0.price'),
        );
});

it('still shows the profit to admins', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get(route('admin.orders.show', $this->order))
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.profit', 600)
            ->where('order.items.0.purchase_price', 400),
        );
});
