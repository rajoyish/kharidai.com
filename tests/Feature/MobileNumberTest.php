<?php

use App\Models\User;
use App\Rules\MobileNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * Run a candidate through the rule in isolation.
 */
function passesMobileNumberRule(string $value): bool
{
    return Validator::make(
        ['mobile_number' => $value],
        ['mobile_number' => [new MobileNumber]],
    )->passes();
}

it('accepts valid Nepali mobile numbers in any accepted shape', function (string $value) {
    expect(passesMobileNumberRule($value))->toBeTrue();
})->with([
    'bare NTC' => '9851234567',
    'bare Ncell' => '9801234567',
    'bare 974 NTC block' => '9740820005',
    'country code, no plus' => '9779851234567',
    'country code with plus' => '+9779851234567',
    'spaced' => '+977 9851 234567',
    'dashed' => '985-123-4567',
]);

it('rejects Nepali numbers that fail the strict carrier check', function (string $value) {
    expect(passesMobileNumberRule($value))->toBeFalse();
})->with([
    'unallocated prefix' => '9891234567',
    'landline' => '0144455556',
    'nine digits behind country code' => '977985123456',
    'eleven digits behind country code' => '97798512345678',
    'not a mobile prefix at all' => '1234567890',
]);

it('accepts international numbers carrying an explicit country code', function (string $value) {
    expect(passesMobileNumberRule($value))->toBeTrue();
})->with([
    'US' => '+12025550123',
    'UK' => '+447911123456',
    'India' => '+919812345678',
    'spaced US' => '+1 202 555 0123',
]);

it('rejects international numbers without a leading plus', function () {
    expect(passesMobileNumberRule('12025550123'))->toBeFalse();
});

it('rejects numbers outside the E.164 digit bounds', function (string $value) {
    expect(passesMobileNumberRule($value))->toBeFalse();
})->with([
    'too short' => '+1234567',
    'too long' => '+1234567890123456',
]);

it('rejects values containing letters or symbols', function (string $value) {
    expect(passesMobileNumberRule($value))->toBeFalse();
})->with([
    'letters' => '98five123456',
    'markup' => '985123456<script>',
]);

/**
 * The rule is not implicit, so Laravel skips it for empty values; emptiness is
 * the business of `required` / `nullable`, which the endpoints supply.
 */
it('leaves empty values to the required and nullable rules', function () {
    expect(passesMobileNumberRule(''))->toBeTrue();
});

it('normalizes numbers to the country-code-prefixed form wa.me expects', function (?string $input, ?string $expected) {
    expect(MobileNumber::normalize($input))->toBe($expected);
})->with([
    'bare Nepali gets 977' => ['9740820005', '9779740820005'],
    'already prefixed is untouched' => ['9779740820005', '9779740820005'],
    'plus is stripped' => ['+9779740820005', '9779740820005'],
    'separators are stripped' => ['+977 9740-820005', '9779740820005'],
    'international keeps its country code' => ['+12025550123', '12025550123'],
    'null stays null' => [null, null],
    'blank becomes null' => ['   ', null],
]);

it('normalizes the mobile number when it is written to a user', function () {
    $user = User::factory()->create(['mobile_number' => '+977 9740-820005']);

    expect($user->fresh()->mobile_number)->toBe('9779740820005');
});

it('shares requiresMobileNumber as true for a user without a number', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('requiresMobileNumber', true));
});

it('shares requiresMobileNumber as false once a number is on file', function () {
    $user = User::factory()->create(['mobile_number' => '9851234567']);

    $this->actingAs($user)->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('requiresMobileNumber', false));
});

it('does not prompt guests for a mobile number', function () {
    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page->where('requiresMobileNumber', false));
});

it('stops sharing requiresMobileNumber once the prompt is dismissed', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('mobile-number.dismiss'))
        ->assertRedirect(route('profile.edit'));

    $this->actingAs($user)->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('requiresMobileNumber', false));
});

it('prompts again on the next login after a dismissal', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('mobile-number.dismiss'));

    $this->post(route('logout'));

    $this->actingAs($user)->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('requiresMobileNumber', true));
});

it('keeps the prompt dismissed across requests within one login', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)->post(route('mobile-number.dismiss'));

    $this->actingAs($user)->get(route('orders.index'))
        ->assertInertia(fn (Assert $page) => $page->where('requiresMobileNumber', false));
});

it('prevents guests from dismissing the prompt', function () {
    $this->post(route('mobile-number.dismiss'))->assertRedirect(route('login'));
});

it('stores a normalized mobile number submitted through the prompt', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('mobile-number.update'), ['mobile_number' => '+977 9851 234567'])
        ->assertRedirect(route('profile.edit'))
        ->assertSessionHasNoErrors();

    expect($user->fresh()->mobile_number)->toBe('9779851234567');
});

it('rejects an invalid mobile number submitted through the prompt', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('mobile-number.update'), ['mobile_number' => '9891234567'])
        ->assertSessionHasErrors('mobile_number');

    expect($user->fresh()->mobile_number)->toBeNull();
});

it('requires a mobile number when submitting the prompt', function () {
    $user = User::factory()->create(['mobile_number' => null]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('mobile-number.update'), ['mobile_number' => ''])
        ->assertSessionHasErrors('mobile_number');
});

it('prevents guests from submitting a mobile number', function () {
    $this->patch(route('mobile-number.update'), ['mobile_number' => '9851234567'])
        ->assertRedirect(route('login'));
});

it('enforces the strict rules on the profile update endpoint', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'mobile_number' => '9891234567',
        ])
        ->assertSessionHasErrors('mobile_number');
});

it('enforces the strict rules on admin user creation', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'New Client',
            'email' => 'client@example.com',
            'mobile_number' => '9891234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
        ->assertSessionHasErrors('mobile_number');
});
