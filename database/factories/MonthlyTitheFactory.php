<?php

namespace Database\Factories;

use App\Models\MonthlyTithe;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MonthlyTithe>
 */
class MonthlyTitheFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $isPaid = fake()->boolean();

        return [
            'month' => fake()->numberBetween(1, 12),
            'year' => (int) fake()->year(),
            'total_amount' => fake()->randomFloat(2, 25, 2500),
            'is_paid' => $isPaid,
            'paid_at' => $isPaid ? fake()->dateTimeThisYear() : null,
        ];
    }
}
