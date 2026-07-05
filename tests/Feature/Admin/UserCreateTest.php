<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('shows the create user form', function () {
    $this->actingAs($this->admin)->get('/admin/users/create')->assertSuccessful();
});

it('creates a regular user', function () {
    $this->actingAs($this->admin)->post('/admin/users', [
        'name' => 'New Client',
        'email' => 'client@example.com',
        'mobile_number' => '9800000000',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertRedirect(route('admin.users.index'));

    $user = User::where('email', 'client@example.com')->firstOrFail();

    expect($user->name)->toBe('New Client')
        ->and($user->is_admin)->toBeFalse()
        ->and($user->email_verified_at)->not->toBeNull()
        ->and(Hash::check('password123', $user->password))->toBeTrue();
});

it('can create an admin user', function () {
    $this->actingAs($this->admin)->post('/admin/users', [
        'name' => 'New Admin',
        'email' => 'admin2@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'is_admin' => true,
    ])->assertRedirect();

    expect(User::where('email', 'admin2@example.com')->firstOrFail()->is_admin)->toBeTrue();
});

it('validates required fields and unique email', function () {
    $existing = User::factory()->create();

    $this->actingAs($this->admin)->post('/admin/users', [
        'name' => '',
        'email' => $existing->email,
        'password' => 'short',
        'password_confirmation' => 'mismatch',
    ])->assertSessionHasErrors(['name', 'email', 'password']);
});

it('blocks non-admins from creating users', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/admin/users/create')->assertForbidden();
});
