<?php

use App\Enums\EngagementStatus;
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
            // The lifecycle status tells the customer we are working on the
            // service; it is shown alongside the payment status, not instead.
            ->where('order.items.0.service_invoices.0.status', 'in_progress')
            ->where('order.items.0.service_invoices.0.status_label', 'In progress')
        );
});

it('rolls the service invoice total up to the order total on the show page', function () {
    // A service order's stored total is the checkout-time estimate (often 0);
    // once an invoice exists, its grand total is what the customer owes.
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'total_amount' => 0,
        'shipping_total' => 0,
    ]);
    $variant = ProductVariant::factory()->create();
    $orderItem = $order->items()->create([
        'product_variant_id' => $variant->id,
        'price' => 0,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->create([
        'user_id' => $this->user->id,
        'order_item_id' => $orderItem->id,
        'line_items' => [['label' => 'Design', 'quantity' => 2, 'unit_price_npr' => 5000]],
        'tax_rate' => 13,
    ]);

    $this->actingAs($this->user)
        ->get('/orders/'.$order->id)
        ->assertInertia(fn ($page) => $page
            ->component('User/Orders/Show')
            ->where('order.display_total_npr', 11300)
        );
});

it('rolls the service invoice total up to the orders list', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'total_amount' => 0,
        'shipping_total' => 0,
    ]);
    $variant = ProductVariant::factory()->create();
    $orderItem = $order->items()->create([
        'product_variant_id' => $variant->id,
        'price' => 0,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->create([
        'user_id' => $this->user->id,
        'order_item_id' => $orderItem->id,
        'line_items' => [['label' => 'Design', 'quantity' => 2, 'unit_price_npr' => 5000]],
        'tax_rate' => 13,
    ]);

    $this->actingAs($this->user)
        ->get('/orders')
        ->assertInertia(fn ($page) => $page
            ->component('User/Orders/Index')
            ->where('orders.data.0.display_total_npr', 11300)
            // Engagements are loaded only to derive the total; their internal
            // pricing terms must not reach the customer's browser.
            ->missing('orders.data.0.items.0.service_engagements')
        );
});

it('keeps the stored item totals for orders without service invoices', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'shipping_total' => 100,
    ]);
    $variant = ProductVariant::factory()->create();
    $order->items()->create([
        'product_variant_id' => $variant->id,
        'price' => 5000,
        'quantity' => 2,
    ]);

    $this->actingAs($this->user)
        ->get('/orders/'.$order->id)
        ->assertInertia(fn ($page) => $page
            ->where('order.display_total_npr', 10100)
        );
});

it('shows the engagement status on the order page before an invoice exists', function () {
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
        'status' => EngagementStatus::FinalBilling,
        'line_items' => null,
    ]);

    $this->actingAs($this->user)
        ->get('/orders/'.$order->id)
        ->assertInertia(fn ($page) => $page
            ->component('User/Orders/Show')
            ->where('order.items.0.service_invoices.0.status_label', 'Final billing')
            ->where('order.items.0.service_invoices.0.line_items', [])
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

it('exposes the amounts the scan-to-pay QR needs on the order details page', function () {
    // The order page renders the same QR panel as the checkout payment page,
    // so it needs the split between what is paid now and what is collected on
    // delivery.
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'amount_due_now' => 250,
        'balance_due' => 1750,
    ]);

    $this->actingAs($this->user)
        ->get('/orders/'.$order->id)
        ->assertInertia(fn ($page) => $page
            ->component('User/Orders/Show')
            ->where('order.amount_due_now', 250)
            ->where('order.balance_due', 1750)
            ->where('order.payment_receipt', null)
        );
});
