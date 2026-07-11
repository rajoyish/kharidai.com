<?php

use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->otherUser = User::factory()->create();
});

function notifyUser(User $user): void
{
    $order = Order::factory()->create(['user_id' => $user->id]);
    $user->notify(new OrderPlacedNotification($order));
}

it('renders the dedicated notifications page for authenticated users', function () {
    notifyUser($this->user);

    $this->actingAs($this->user)
        ->get(route('user.notifications.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Notifications/Index')
            ->has('notifications.data', 1)
            ->where('unread_count', 1)
        );
});

it('marks all notifications as read in bulk without deleting them', function () {
    notifyUser($this->user);

    expect($this->user->unreadNotifications()->count())->toBe(1);

    $this->actingAs($this->user)
        ->patch(route('user.notifications.mark-all-read'))
        ->assertRedirect();

    expect($this->user->fresh()->notifications()->count())->toBe(1)
        ->and($this->user->fresh()->unreadNotifications()->count())->toBe(0);
});

it('deletes all notifications in bulk', function () {
    notifyUser($this->user);

    expect($this->user->notifications()->count())->toBe(1);

    $this->actingAs($this->user)
        ->delete(route('user.notifications.destroy-all'))
        ->assertRedirect();

    expect($this->user->fresh()->notifications()->count())->toBe(0);
});

it('only ever scopes bulk actions to the acting user', function () {
    notifyUser($this->user);
    notifyUser($this->otherUser);

    $this->actingAs($this->user)
        ->delete(route('user.notifications.destroy-all'))
        ->assertRedirect();

    expect($this->user->fresh()->notifications()->count())->toBe(0)
        ->and($this->otherUser->fresh()->notifications()->count())->toBe(1);
});

it('requires authentication to access notifications', function () {
    $this->get(route('user.notifications.index'))->assertRedirect(route('login'));
});
