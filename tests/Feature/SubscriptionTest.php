<?php

use App\Models\Order;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('allows users to view their subscriptions', function () {
    $user = User::factory()->create();
    $subscription = Subscription::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->get(route('subscriptions.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('User/Subscriptions/Index')
        ->has('subscriptions', 1)
        ->where('subscriptions.0.id', $subscription->id)
    );
});

it('allows users to update their subscription label', function () {
    $user = User::factory()->create();
    $subscription = Subscription::factory()->create(['user_id' => $user->id, 'user_label' => null]);

    $response = $this->actingAs($user)->put(route('subscriptions.update', $subscription), [
        'user_label' => 'Personal Workspace',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('subscriptions', [
        'id' => $subscription->id,
        'user_label' => 'Personal Workspace',
    ]);
});

it('prevents users from updating other users subscriptions', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $subscription = Subscription::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->put(route('subscriptions.update', $subscription), [
        'user_label' => 'Personal Workspace',
    ]);

    $response->assertForbidden();
});

it('allows admins to view all subscriptions', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Subscription::factory()->count(3)->create();

    $response = $this->actingAs($admin)->get(route('admin.subscriptions.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Subscriptions/Index')
        ->has('subscriptions.data', 3)
    );
});

it('serializes expired status for user and admin subscription listings', function () {
    $this->travelTo(Carbon::parse('2026-07-02 12:00:00'));

    try {
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $order = Order::factory()->create(['user_id' => $user->id]);

        $expiredSubscription = Subscription::factory()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'start_date' => '2026-06-01',
            'end_date' => '2026-07-01',
        ]);
        $activeSubscription = Subscription::factory()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-03',
        ]);
        $lifetimeSubscription = Subscription::factory()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'start_date' => '2026-05-01',
            'end_date' => null,
        ]);

        expect($expiredSubscription->fresh()->is_expired)->toBeTrue();
        expect($activeSubscription->fresh()->is_expired)->toBeFalse();
        expect($lifetimeSubscription->fresh()->is_expired)->toBeFalse();

        $userResponse = $this->actingAs($user)->get(route('subscriptions.index'));
        $userResponse->assertSuccessful();

        $userSubscriptions = collect($userResponse->inertiaProps('subscriptions'))->keyBy('id');

        expect($userSubscriptions->get($expiredSubscription->id)['is_expired'])->toBeTrue();
        expect($userSubscriptions->get($activeSubscription->id)['is_expired'])->toBeFalse();
        expect($userSubscriptions->get($lifetimeSubscription->id)['is_expired'])->toBeFalse();

        $adminResponse = $this->actingAs($admin)->get(route('admin.subscriptions.index'));
        $adminResponse->assertSuccessful();

        $adminSubscriptions = collect($adminResponse->inertiaProps('subscriptions.data'))->keyBy('id');

        expect($adminSubscriptions->get($expiredSubscription->id)['is_expired'])->toBeTrue();
        expect($adminSubscriptions->get($activeSubscription->id)['is_expired'])->toBeFalse();
        expect($adminSubscriptions->get($lifetimeSubscription->id)['is_expired'])->toBeFalse();
    } finally {
        $this->travelBack();
    }
});

it('prevents non-admins from viewing admin subscriptions panel', function () {
    $user = User::factory()->create();
    Subscription::factory()->count(3)->create();

    $response = $this->actingAs($user)->get(route('admin.subscriptions.index'));

    $response->assertForbidden();
});

it('deletes subscriptions when the order is deleted', function () {
    $order = Order::factory()->create();
    $subscription = Subscription::factory()->create(['order_id' => $order->id]);

    $this->assertDatabaseHas('subscriptions', ['id' => $subscription->id]);

    $order->delete();

    $this->assertDatabaseMissing('subscriptions', ['id' => $subscription->id]);
});
