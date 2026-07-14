<?php

use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use App\Notifications\PaymentReceiptUploadedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * These notifications are queued by the broadcast channel, and a queued model is
 * stored as an id and re-fetched when the job runs. Laravel's broadcast event
 * cannot be told to discard itself when that model is missing, so an order deleted
 * between queueing and running takes the job down with a ModelNotFoundException.
 *
 * Holding no model is what prevents that. If someone reintroduces a live Order
 * property, serializing will start emitting a model identifier again and these
 * tests fail.
 */
it('holds no eloquent model, so a deleted order cannot break the job', function (object $notification) {
    $serialized = serialize($notification);

    expect($serialized)
        ->not->toContain('ModelIdentifier')
        ->not->toContain('App\Models\Order');

    // Round-trips without touching the database at all.
    $revived = unserialize($serialized);

    expect($revived->toArray(new User(['is_admin' => true])))
        ->toHaveKeys(['message', 'description', 'url', 'order_id']);
})->with([
    'order placed' => fn () => new OrderPlacedNotification(Order::factory()->create()),
    'status updated' => fn () => new OrderStatusUpdatedNotification(Order::factory()->create(), 'completed'),
    'receipt uploaded' => fn () => new PaymentReceiptUploadedNotification(Order::factory()->create()),
]);

it('still renders its payload after the order is gone', function () {
    $order = Order::factory()->create(['total_amount' => 2100]);

    $notification = new OrderPlacedNotification($order);

    $order->delete();

    // The whole point: no re-fetch, so nothing to fail.
    $payload = $notification->toArray(new User(['is_admin' => true]));

    expect($payload['order_id'])->toBe($order->id)
        ->and($payload['message'])->toContain($order->order_number)
        ->and($payload['description'])->toContain('2,100');
});
