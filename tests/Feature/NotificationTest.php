<?php

use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('can view notifications', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $this->user->notify(new OrderPlacedNotification($order));

    $response = $this->actingAs($this->user)->getJson('/notifications');

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'notifications',
        'unread_count',
    ]);
});

it('can mark a notification as read', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $this->user->notify(new OrderPlacedNotification($order));

    $notification = $this->user->notifications()->first();

    $response = $this->actingAs($this->user)->postJson('/notifications/'.$notification->id.'/mark-read');

    $response->assertSuccessful();

    $notification->refresh();
    expect($notification->read_at)->not->toBeNull();
});

it('marks only the targeted notification as read, leaving the rest unread', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $this->user->notify(new OrderPlacedNotification($order));
    $this->user->notify(new OrderPlacedNotification($order));

    [$target, $other] = $this->user->notifications()->get()->all();

    $this->actingAs($this->user)
        ->postJson('/notifications/'.$target->id.'/mark-read')
        ->assertSuccessful();

    expect($target->fresh()->read_at)->not->toBeNull()
        ->and($other->fresh()->read_at)->toBeNull()
        ->and($this->user->unreadNotifications()->count())->toBe(1);
});

it('does not let a user mark another user\'s notification as read', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $this->user->notify(new OrderPlacedNotification($order));
    $notification = $this->user->notifications()->first();

    $stranger = User::factory()->create();

    $this->actingAs($stranger)
        ->postJson('/notifications/'.$notification->id.'/mark-read')
        ->assertNotFound();

    expect($notification->fresh()->read_at)->toBeNull();
});

it('marks all notifications as read without deleting them', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $this->user->notify(new OrderPlacedNotification($order));

    $response = $this->actingAs($this->user)->postJson('/notifications/mark-all-read');

    $response->assertSuccessful();

    expect($this->user->notifications()->count())->toBe(1)
        ->and($this->user->unreadNotifications()->count())->toBe(0);
});
