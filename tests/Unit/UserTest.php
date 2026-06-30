<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('privileged attributes are not mass assignable', function () {
    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'is_admin' => true,
        'banned_at' => now(),
    ]);

    expect($user->fresh()->is_admin)->toBeFalse();
    expect($user->fresh()->banned_at)->toBeNull();
});
