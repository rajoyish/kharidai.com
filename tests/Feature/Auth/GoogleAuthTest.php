<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;

uses(RefreshDatabase::class);

it('redirects to google for authentication', function () {
    $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
    $provider->shouldReceive('redirect')->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

    $response = $this->get('/auth/google');

    $response->assertRedirect('https://accounts.google.com/o/oauth2/auth');
});

it('authenticates user and redirects to dashboard on successful google callback', function () {
    $abstractUser = new Laravel\Socialite\Two\User;
    $abstractUser->map([
        'id' => '1234567890',
        'name' => 'Google User',
        'email' => 'google@example.com',
        'avatar' => 'https://example.com/avatar.jpg',
    ]);

    $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
    $provider->shouldReceive('user')->andReturn($abstractUser);

    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect(config('fortify.home', '/dashboard'));

    $this->assertDatabaseHas('users', [
        'email' => 'google@example.com',
        'name' => 'Google User',
        'google_id' => '1234567890',
    ]);

    $this->assertAuthenticated();
});

it('prevents banned user from logging in via google', function () {
    $user = User::factory()->create([
        'email' => 'banned@example.com',
        'banned_at' => now(),
    ]);

    $abstractUser = new Laravel\Socialite\Two\User;
    $abstractUser->map([
        'id' => '1234567890',
        'name' => 'Banned User',
        'email' => 'banned@example.com',
        'avatar' => 'https://example.com/avatar.jpg',
    ]);

    $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
    $provider->shouldReceive('user')->andReturn($abstractUser);

    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect(route('login'));
    $this->assertGuest();
});

it('handles exceptions during google callback gracefully', function () {
    $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
    $provider->shouldReceive('user')->andThrow(new Exception('Network Error'));

    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect(route('login'));
});
