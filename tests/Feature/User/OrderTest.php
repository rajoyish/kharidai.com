<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use App\Events\OrderMessageCreated;
use App\Notifications\NewMessageNotification;

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

    $response = $this->actingAs($this->user)->get('/orders/' . $order->id);

    $response->assertSuccessful();
});

it('cannot view other user order details', function () {
    $otherUser = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($this->user)->get('/orders/' . $order->id);

    $response->assertForbidden();
});

it('can send a message on an order', function () {
    Event::fake();
    Notification::fake();

    $order = Order::factory()->create(['user_id' => $this->user->id]);

    $response = $this->actingAs($this->user)->post('/orders/' . $order->id . '/messages', [
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
