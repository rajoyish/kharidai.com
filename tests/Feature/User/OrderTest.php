<?php

use App\Events\OrderMessageCreated;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list user orders', function () {
    Order::factory()->count(3)->create(['user_id' => $this->user->id]);
    Order::factory()->count(2)->create(); // Other user's orders

    $response = $this->actingAs($this->user)->get('/orders');

    $response->assertSuccessful();
    // In inertia, we could assert the page component and props, but for now assertSuccessful is enough
});

it('can view specific order details', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->user)->get('/orders/'.$order->id);

    $response->assertSuccessful();
});

it('shows the service invoice on the order details page', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $variant = ProductVariant::factory()->create();
    $orderItem = $order->items()->create([
        'product_variant_id' => $variant->id,
        'price' => 5000,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->create([
        'user_id' => $this->user->id,
        'order_item_id' => $orderItem->id,
        'project_name' => 'Brand Refresh',
        'line_items' => [['label' => 'Design', 'quantity' => 2, 'unit_price_npr' => 5000]],
        'tax_rate' => 13,
        'advance_paid_npr' => 4000,
        'agreed_price_npr' => 11300,
        'is_paid' => false,
    ]);

    $this->actingAs($this->user)
        ->get('/orders/'.$order->id)
        ->assertInertia(fn ($page) => $page
            ->component('User/Orders/Show')
            ->where('order.items.0.service_invoices.0.project_name', 'Brand Refresh')
            ->where('order.items.0.service_invoices.0.grand_total_npr', 11300)
            ->where('order.items.0.service_invoices.0.due_npr', 7300)
            ->where('order.items.0.service_invoices.0.payment_status', 'due')
        );
});

it('cannot view other user order details', function () {
    $otherUser = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($this->user)->get('/orders/'.$order->id);

    $response->assertForbidden();
});

it('can send a message on an order', function () {
    Event::fake();
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->user)->post('/orders/'.$order->id.'/messages', [
        'message' => 'Hello this is a test message',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('order_messages', [
        'order_id' => $order->id,
        'user_id' => $this->user->id,
        'message' => 'Hello this is a test message',
    ]);

    Event::assertDispatched(OrderMessageCreated::class);
    Notification::assertSentTo($this->admin, NewMessageNotification::class);
});

it('can ask for receipt reupload', function () {
    Event::fake();
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->user)->post('/orders/'.$order->id.'/ask-reupload-receipt');

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'request_receipt_upload' => true,
    ]);

    $this->assertDatabaseHas('order_messages', [
        'order_id' => $order->id,
        'user_id' => $this->user->id,
        'message' => 'I would like to request permission to re-upload my payment receipt.',
    ]);

    Event::assertDispatched(OrderMessageCreated::class);
    Notification::assertSentTo($this->admin, NewMessageNotification::class);
});
