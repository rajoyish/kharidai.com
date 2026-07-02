<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Support\SessionKey;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

test('an admin can list users', function () {
    $this->travelTo(Carbon::parse('2026-07-02 12:00:00'));

    try {
        $admin = User::factory()->create([
            'is_admin' => true,
            'created_at' => Carbon::parse('2026-06-20 12:00:00'),
        ]);
        $user = User::factory()->create([
            'created_at' => Carbon::parse('2026-06-29 12:00:00'),
            'last_active_at' => Carbon::parse('2026-07-01 12:00:00'),
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertSuccessful();

        $listedUser = collect($response->inertiaProps('users'))->firstWhere('id', $user->id);

        expect($listedUser)->not->toBeNull()
            ->and($listedUser['created_at_relative'])->toBe('3 days ago')
            ->and($listedUser['created_at_absolute'])->toBe('6/29/2026')
            ->and($listedUser['last_active_relative'])->toBe('1 day ago')
            ->and($listedUser['last_active_absolute'])->toBe('7/1/2026');
    } finally {
        $this->travelBack();
    }
});

test('an admin can ban and unban another user', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.ban', $user))
        ->assertRedirect();

    expect($user->fresh()->banned_at)->not->toBeNull();

    $this->actingAs($admin)
        ->post(route('admin.users.ban', $user))
        ->assertRedirect();

    expect($user->fresh()->banned_at)->toBeNull();
});

test('an admin cannot ban themselves', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post(route('admin.users.ban', $admin))
        ->assertRedirect()
        ->assertSessionHas(SessionKey::FLASH_DATA, [
            'toast' => ['type' => 'error', 'message' => 'You cannot ban yourself.'],
        ]);

    expect($admin->fresh()->banned_at)->toBeNull();
});

test('an admin can delete another user', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $user))
        ->assertRedirect();

    $this->assertModelMissing($user);
});

test('an admin cannot delete themselves', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $admin))
        ->assertRedirect()
        ->assertSessionHas(SessionKey::FLASH_DATA, [
            'toast' => ['type' => 'error', 'message' => 'You cannot delete yourself.'],
        ]);

    $this->assertModelExists($admin);
});

test('banned users cannot authenticate with password', function () {
    $user = User::factory()->create([
        'banned_at' => now(),
        'password' => Hash::make('password'),
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('active users can still authenticate with password', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
});

test('banned users are logged out on authenticated routes', function () {
    $user = User::factory()->create(['banned_at' => now()]);

    $this->actingAs($user)
        ->get(route('orders.index'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('active users can still authenticate with google', function () {
    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-123',
        'name' => 'Active User',
        'email' => 'active@example.com',
        'avatar' => 'https://example.com/avatar.jpg',
    ]));

    $this->get(route('google.callback'))
        ->assertRedirect(config('fortify.home', '/'));

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'active@example.com',
        'google_id' => 'google-123',
    ]);
});

test('banned users cannot authenticate with google', function () {
    $user = User::factory()->create([
        'email' => 'banned@example.com',
        'banned_at' => now(),
    ]);

    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-123',
        'name' => $user->name,
        'email' => $user->email,
        'avatar' => 'https://example.com/avatar.jpg',
    ]));

    $this->get(route('google.callback'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});
