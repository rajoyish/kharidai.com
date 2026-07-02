<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('can view profile page', function () {
    $response = $this->actingAs($this->user)->get('/settings/profile');

    $response->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('profile.name', $this->user->name)
            ->where('profile.email', $this->user->email)
            ->where('profile.mobile_number', $this->user->mobile_number)
            ->where('auth.user.id', $this->user->id)
            ->where('auth.user.name', $this->user->name)
            ->where('auth.user.email', $this->user->email)
            ->where('auth.user.is_admin', $this->user->is_admin)
            ->missing('auth.user.mobile_number')
        );
});

it('can update profile information', function () {
    $response = $this->actingAs($this->user)->patch('/settings/profile', [
        'name' => 'Updated Name',
        'email' => 'updated@example.com',
    ]);

    $response->assertRedirect(route('profile.edit'));
    $this->user->refresh();

    expect($this->user->name)->toBe('Updated Name')
        ->and($this->user->email)->toBe('updated@example.com')
        ->and($this->user->email_verified_at)->toBeNull();
});

it('can delete account', function () {
    $response = $this->actingAs($this->user)->delete('/settings/profile', [
        'password' => 'password', // Assuming the ProfileDeleteRequest requires a password
    ]);

    $response->assertRedirect('/');
    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['id' => $this->user->id]);
});
