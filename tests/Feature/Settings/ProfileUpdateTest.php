<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
});

test('profile update never changes the email address', function () {
    $user = User::factory()->create(['email' => 'owner@example.com']);

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'someone-else@gmail.com',
        ])
        ->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->email)->toBe('owner@example.com');
    expect($user->email_verified_at)->not->toBeNull();
});

test('profile update ignores privileged user attributes', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'is_admin' => true,
            'banned_at' => now()->toISOString(),
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh()->is_admin)->toBeFalse();
    expect($user->fresh()->banned_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('a banned user is signed out of the settings pages', function (string $method, string $route) {
    $user = User::factory()->create(['banned_at' => now(), 'name' => 'Original Name']);

    $this->actingAs($user)
        ->{$method}(route($route), ['name' => 'Changed Name'])
        ->assertRedirect(route('login'));

    $this->assertGuest();
    expect($user->fresh()->name)->toBe('Original Name');
})->with([
    'view profile' => ['get', 'profile.edit'],
    'update profile' => ['patch', 'profile.update'],
    'delete account' => ['delete', 'profile.destroy'],
]);
