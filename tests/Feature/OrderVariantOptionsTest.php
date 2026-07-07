<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Build an order for the given user holding a single physical line item with a
 * chosen color/size and a variant weight, so the order-show pages have all three
 * attributes to render.
 */
function orderWithChosenOptions(User $user): Order
{
    $product = Product::factory()->physical()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'weight_kg' => 0.5,
    ]);

    $order = Order::factory()->create(['user_id' => $user->id]);
    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1000,
        'quantity' => 1,
        'selected_options' => ['color' => 'Red', 'size' => 'XL'],
    ]);

    return $order;
}

it('exposes the chosen color, size and weight on the customer order page', function () {
    $user = User::factory()->create();
    $order = orderWithChosenOptions($user);

    $this->actingAs($user)
        ->get("/orders/{$order->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Orders/Show')
            ->where('order.items.0.selected_options.color', 'Red')
            ->where('order.items.0.selected_options.size', 'XL')
            ->where('order.items.0.product_variant.weight_kg', '0.50')
        );
});

it('exposes the chosen color, size and weight on the admin order page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $order = orderWithChosenOptions(User::factory()->create());

    $this->actingAs($admin)
        ->get("/admin/orders/{$order->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Orders/Show')
            ->where('order.items.0.selected_options.color', 'Red')
            ->where('order.items.0.selected_options.size', 'XL')
            ->where('order.items.0.product_variant.weight_kg', '0.50')
        );
});
