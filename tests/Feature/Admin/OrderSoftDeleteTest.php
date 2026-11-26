<?php

use App\Models\Order;
use App\Models\PaymentReceipt;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('public');

    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->customer = User::factory()->create();
    $this->order = Order::factory()->create(['user_id' => $this->customer->id]);
});

/**
 * An order with a receipt file on disk and a subscription bought in it: the
 * things a soft delete must keep and a permanent delete must remove.
 */
function orderWithAttachments(Order $order): Subscription
{
    Storage::disk('public')->put('receipts/paid.jpg', 'image');

    PaymentReceipt::create([
        'order_id' => $order->id,
        'file_path' => 'receipts/paid.jpg',
        'status' => 'approved',
    ]);

    return Subscription::factory()->create(['order_id' => $order->id]);
}

test('deleting an order hides it but keeps its receipt and subscriptions', function () {
    $subscription = orderWithAttachments($this->order);

    $this->actingAs($this->admin)
        ->delete(route('admin.orders.destroy', $this->order))
        ->assertRedirect(route('admin.orders.index'));

    $this->assertSoftDeleted($this->order);
    $this->assertModelExists($subscription);
    Storage::disk('public')->assertExists('receipts/paid.jpg');
});

test('a deleted order disappears from the customer side', function () {
    orderWithAttachments($this->order);
    $this->order->delete();

    $this->actingAs($this->customer)
        ->get(route('orders.show', $this->order))
        ->assertNotFound();

    $this->actingAs($this->customer)
        ->get(route('orders.index'))
        ->assertInertia(fn (Assert $page) => $page->where('orders.data', []));

    $this->actingAs($this->customer)
        ->get(route('subscriptions.index'))
        ->assertInertia(fn (Assert $page) => $page->has('subscriptions', 0));
});

test('deleted orders are listed on their own page, not with live orders', function () {
    $this->order->delete();
    $live = Order::factory()->create(['user_id' => $this->customer->id]);

    $this->actingAs($this->admin)
        ->get(route('admin.orders.deleted'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Orders/Deleted')
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $this->order->id)
            ->where('orders.data.0.customer.email', $this->customer->email));

    $this->actingAs($this->admin)
        ->get(route('admin.orders.index', ['year' => $live->created_at->year]))
        ->assertInertia(fn (Assert $page) => $page->missing('deletedOrders'));
});

test('the deleted orders page searches by order number', function () {
    $this->order->delete();
    $other = Order::factory()->create(['user_id' => $this->customer->id]);
    $other->delete();

    $this->actingAs($this->admin)
        ->get(route('admin.orders.deleted', ['search' => $this->order->order_number]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $this->order->id));
});

test('customers cannot see the deleted orders page', function () {
    $this->actingAs($this->customer)
        ->get(route('admin.orders.deleted'))
        ->assertForbidden();
});

test('opening a deleted order sends the admin back to the list', function () {
    $this->order->delete();

    $this->actingAs($this->admin)
        ->get(route('admin.orders.show', $this->order))
        ->assertRedirect(route('admin.orders.index'))
        ->assertSessionHas('error');
});

test('restoring an order brings it and its subscriptions back to the customer', function () {
    orderWithAttachments($this->order);
    $this->order->delete();

    $this->actingAs($this->admin)
        ->patch(route('admin.orders.restore', $this->order))
        ->assertRedirect();

    $this->assertNotSoftDeleted($this->order);

    $this->actingAs($this->customer)->get(route('orders.show', $this->order))->assertSuccessful();
    $this->actingAs($this->customer)
        ->get(route('subscriptions.index'))
        ->assertInertia(fn (Assert $page) => $page->has('subscriptions', 1));
});

test('a permanent delete erases the order, its subscriptions and its receipt file', function () {
    $subscription = orderWithAttachments($this->order);
    $this->order->delete();

    $this->actingAs($this->admin)
        ->delete(route('admin.orders.force-destroy', $this->order))
        ->assertRedirect();

    $this->assertModelMissing($this->order);
    $this->assertModelMissing($subscription);
    Storage::disk('public')->assertMissing('receipts/paid.jpg');
});

test('a live order cannot be permanently deleted or restored', function (string $method, string $route) {
    $this->actingAs($this->admin)
        ->{$method}(route($route, $this->order))
        ->assertNotFound();

    $this->assertNotSoftDeleted($this->order);
})->with([
    'permanent delete' => ['delete', 'admin.orders.force-destroy'],
    'restore' => ['patch', 'admin.orders.restore'],
]);

test('customers cannot delete, restore or erase orders', function (string $method, string $route, bool $trashed) {
    if ($trashed) {
        $this->order->delete();
    }

    $this->actingAs($this->customer)
        ->{$method}(route($route, $this->order))
        ->assertForbidden();

    expect(Order::withTrashed()->find($this->order->id)->trashed())->toBe($trashed);
})->with([
    'delete' => ['delete', 'admin.orders.destroy', false],
    'restore' => ['patch', 'admin.orders.restore', true],
    'permanent delete' => ['delete', 'admin.orders.force-destroy', true],
]);
