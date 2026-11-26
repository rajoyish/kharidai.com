<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->customer = User::factory()->create();
});

/**
 * An order holding one product of the given factory state ('' for digital).
 */
function orderOfType(User $customer, string $state = ''): Order
{
    $product = $state === '' ? Product::factory() : Product::factory()->{$state}();
    $order = Order::factory()->create(['user_id' => $customer->id]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->for($product)->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    return $order;
}

test('each product type has its own orders list', function (string $state, array $params, string $label) {
    $wanted = orderOfType($this->customer, $state);
    orderOfType($this->customer, $state === '' ? 'physical' : '');

    $this->actingAs($this->admin)
        ->get(route('admin.orders.index', $params))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Orders/Index')
            ->where('productType.label', $label)
            ->has('orders', 1)
            ->where('orders.0.id', $wanted->id));
})->with([
    'digital at the bare url' => ['', [], 'Digital'],
    'physical' => ['physical', ['productType' => 'physical'], 'Physical'],
    'service' => ['service', ['productType' => 'service'], 'Service'],
]);

test('a type segment that is not a list does not render one', function (string $path) {
    $this->actingAs($this->admin)->get($path)->assertNotFound();
})->with([
    'digital has no segment of its own' => '/admin/orders/digital',
    'unknown type' => '/admin/orders/furniture',
]);

test('deleting an order returns the admin to that order\'s list', function (string $state, string $expectedUrl) {
    $order = orderOfType($this->customer, $state);

    $this->actingAs($this->admin)
        ->delete(route('admin.orders.destroy', $order))
        ->assertRedirect(url($expectedUrl));
})->with([
    'digital' => ['', '/admin/orders'],
    'physical' => ['physical', '/admin/orders/physical'],
]);

test('the deleted orders page shows each order\'s product type', function () {
    orderOfType($this->customer, 'service')->delete();

    $this->actingAs($this->admin)
        ->get(route('admin.orders.deleted'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('orders.data.0.types', [['value' => 'service', 'label' => 'Service']]));
});
