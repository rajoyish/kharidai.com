<?php

use App\Events\OrderMessageCreated;
use App\Models\Order;
use App\Models\OrderCredential;
use App\Models\PaymentReceipt;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->user = User::factory()->create();
});

it('can list orders', function () {
    Order::factory()->count(3)->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->admin)->get('/admin/orders');

    $response->assertSuccessful();
});

it('can view order details', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->admin)->get('/admin/orders/'.$order->id);

    $response->assertSuccessful();
});

it('can update order status', function () {
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id, 'status' => 'pending']);

    $response = $this->actingAs($this->admin)->patch('/admin/orders/'.$order->id.'/status', [
        'status' => 'delivering',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'status' => 'delivering',
    ]);

    Notification::assertSentTo($this->user, OrderStatusUpdatedNotification::class);
});

it('can update receipt status', function () {
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id, 'status' => 'pending']);
    $receipt = PaymentReceipt::create([
        'order_id' => $order->id,
        'file_path' => 'test.jpg',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/receipts/'.$receipt->id.'/status', [
        'status' => 'approved',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('payment_receipts', [
        'id' => $receipt->id,
        'status' => 'approved',
    ]);
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'status' => 'delivering',
    ]);

    Notification::assertSentTo($this->user, OrderStatusUpdatedNotification::class);
});

it('can add digital credentials to an order', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->admin)->post('/admin/orders/'.$order->id.'/credentials', [
        'content' => 'Test Credential Content',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('order_credentials', [
        'order_id' => $order->id,
        'content' => 'Test Credential Content',
    ]);
});

it('can update digital credentials', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $credential = OrderCredential::create([
        'order_id' => $order->id,
        'content' => 'Old Content',
    ]);

    $response = $this->actingAs($this->admin)->put('/admin/orders/'.$order->id.'/credentials/'.$credential->id, [
        'content' => 'New Content',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('order_credentials', [
        'id' => $credential->id,
        'content' => 'New Content',
    ]);
});

it('can delete digital credentials', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $credential = OrderCredential::create([
        'order_id' => $order->id,
        'content' => 'Old Content',
    ]);

    $response = $this->actingAs($this->admin)->delete('/admin/orders/'.$order->id.'/credentials/'.$credential->id);

    $response->assertRedirect();
    $this->assertDatabaseMissing('order_credentials', [
        'id' => $credential->id,
    ]);
});

it('can send a message on an order', function () {
    Event::fake();
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->admin)->post('/admin/orders/'.$order->id.'/messages', [
        'message' => 'Admin test message',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('order_messages', [
        'order_id' => $order->id,
        'user_id' => $this->admin->id,
        'message' => 'Admin test message',
    ]);

    Event::assertDispatched(OrderMessageCreated::class);
    Notification::assertSentTo($this->user, NewMessageNotification::class);
});

it('can delete an order', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->admin)->delete('/admin/orders/'.$order->id);

    $response->assertRedirect(route('admin.orders.index'));
    $this->assertDatabaseMissing('orders', [
        'id' => $order->id,
    ]);
});

it('can allow receipt reupload', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id, 'request_receipt_upload' => true]);

    $response = $this->actingAs($this->admin)->patch('/admin/orders/'.$order->id.'/allow-reupload');

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'can_reupload_receipt' => true,
        'request_receipt_upload' => false,
    ]);
});
