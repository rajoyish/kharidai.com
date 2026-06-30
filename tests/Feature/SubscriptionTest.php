<?php

use App\Models\Order;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
