<?php

use App\Events\OrderMessageCreated;
use App\Models\Order;
use App\Models\OrderCredential;
use App\Models\OrderItem;
use App\Models\OrderMessage;
use App\Models\PaymentReceipt;
use App\Models\ProductVariant;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

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
    $this->assertDatabaseMissing('subscriptions', [
        'order_id' => $order->id,
    ]);

    Notification::assertSentTo($this->user, OrderStatusUpdatedNotification::class);
});

it('creates one subscription per purchased unit when an admin completes an order', function () {
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id, 'status' => 'pending']);
    $subscriptionVariant = ProductVariant::factory()->create([
        'validity_days' => 30,
    ]);
    $oneTimeVariant = ProductVariant::factory()->create([
        'validity_days' => null,
    ]);

    $subscriptionItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $subscriptionVariant->id,
        'price' => 1200,
        'purchase_price' => 800,
        'quantity' => 2,
    ]);
    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $oneTimeVariant->id,
        'price' => 600,
        'purchase_price' => 300,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/orders/'.$order->id.'/status', [
        'status' => 'completed',
    ]);

    $startDate = today()->toDateString();
    $endDate = today()->addDays(30)->toDateString();
    $subscriptions = Subscription::query()
        ->where('order_item_id', $subscriptionItem->id)
        ->orderBy('id')
        ->get();

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'status' => 'completed',
    ]);
    expect($subscriptions)->toHaveCount(2);
    expect($subscriptions->pluck('user_id')->unique()->all())->toBe([$this->user->id]);
    expect($subscriptions->pluck('order_id')->unique()->all())->toBe([$order->id]);
    expect($subscriptions->pluck('start_date')->map->toDateString()->unique()->all())->toBe([$startDate]);
    expect($subscriptions->pluck('end_date')->map->toDateString()->unique()->all())->toBe([$endDate]);
    expect($subscriptions->pluck('days_left')->unique()->all())->toBe([30]);
    $this->assertDatabaseCount('subscriptions', 2);

    Notification::assertSentTo($this->user, OrderStatusUpdatedNotification::class);
});

it('does not create subscriptions for non-subscription products', function () {
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id, 'status' => 'pending']);
    $variant = ProductVariant::factory()->create([
        'validity_days' => null,
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 500,
        'purchase_price' => 250,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->admin)->patch('/admin/orders/'.$order->id.'/status', [
        'status' => 'completed',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseMissing('subscriptions', [
        'order_id' => $order->id,
    ]);
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

it('can delete an order with related records', function () {
    Storage::fake('public');

    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $variant = ProductVariant::factory()->create();
    $item = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1000,
        'purchase_price' => 600,
        'quantity' => 1,
    ]);
    $receipt = PaymentReceipt::create([
        'order_id' => $order->id,
        'file_path' => 'receipts/test.jpg',
        'status' => 'pending',
    ]);
    $credential = OrderCredential::create([
        'order_id' => $order->id,
        'content' => 'Credential content',
    ]);
    $message = OrderMessage::create([
        'order_id' => $order->id,
        'user_id' => $this->admin->id,
        'message' => 'Support message',
    ]);

    Storage::disk('public')->put($receipt->file_path, 'receipt');

    $response = $this->actingAs($this->admin)->delete('/admin/orders/'.$order->id);

    $response->assertRedirect(route('admin.orders.index'));
    $this->assertDatabaseMissing('orders', [
        'id' => $order->id,
    ]);
    $this->assertDatabaseMissing('order_items', [
        'id' => $item->id,
    ]);
    $this->assertDatabaseMissing('payment_receipts', [
        'id' => $receipt->id,
    ]);
    $this->assertDatabaseMissing('order_credentials', [
        'id' => $credential->id,
    ]);
    $this->assertDatabaseMissing('order_messages', [
        'id' => $message->id,
    ]);
    Storage::disk('public')->assertMissing($receipt->file_path);
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
