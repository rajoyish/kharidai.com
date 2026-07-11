<?php

use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->user = User::factory()->create();
});

function notifyAdmin(User $admin): void
{
    $order = Order::factory()->create(['user_id' => $admin->id]);
    $admin->notify(new OrderPlacedNotification($order));
}

it('renders the dedicated notifications page for admins', function () {
    notifyAdmin($this->admin);

    $this->actingAs($this->admin)
        ->get(route('admin.notifications.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Notifications/Index')
            ->has('notifications.data', 1)
            ->where('unread_count', 1)
        );
});

it('marks all notifications as read in bulk without deleting them', function () {
    notifyAdmin($this->admin);

    expect($this->admin->unreadNotifications()->count())->toBe(1);

    $this->actingAs($this->admin)
        ->patch(route('admin.notifications.mark-all-read'))
        ->assertRedirect();

    expect($this->admin->fresh()->notifications()->count())->toBe(1)
        ->and($this->admin->fresh()->unreadNotifications()->count())->toBe(0);
});

it('deletes all notifications in bulk', function () {
    notifyAdmin($this->admin);

    expect($this->admin->notifications()->count())->toBe(1);

    $this->actingAs($this->admin)
        ->delete(route('admin.notifications.destroy-all'))
        ->assertRedirect();

    expect($this->admin->fresh()->notifications()->count())->toBe(0);
});

it('prevents non-admins from accessing notification management', function () {
    $this->actingAs($this->user)
        ->get(route('admin.notifications.index'))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->patch(route('admin.notifications.mark-all-read'))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->delete(route('admin.notifications.destroy-all'))
        ->assertForbidden();
});
