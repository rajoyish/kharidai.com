<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),

            // Google is how customers actually get an account here, and some
            // features read `google_id` to tell a real sign-in from an address
            // someone typed. A factory user is one of the former by default; use
            // manual() for the latter.
            'google_id' => (string) fake()->unique()->numberBetween(100000000, 999999999),
        ];
    }

    /**
     * Indicate that the account was created by hand rather than by signing in
     * with Google: the registration form, a seeder, or a support fix.
     */
    public function manual(): static
    {
        return $this->state(fn (array $attributes): array => [
            'google_id' => null,
            'avatar' => null,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Indicate that the model has two-factor authentication configured and confirmed.
     */
    public function withTwoFactor(): static
    {
        return $this->state(fn (array $attributes): array => [
            'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'),
            'two_factor_recovery_codes' => encrypt(json_encode([
                'recovery-code-one',
                'recovery-code-two',
            ])),
            'two_factor_confirmed_at' => now(),
        ]);
    }
}
