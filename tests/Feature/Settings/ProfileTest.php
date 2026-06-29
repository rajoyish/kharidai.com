<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('can view profile page', function () {
    $response = $this->actingAs($this->user)->get('/settings/profile');

    $response->assertSuccessful();
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
