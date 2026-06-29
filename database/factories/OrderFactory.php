<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_number' => 'ORD-' . strtoupper($this->faker->lexify('??????????')),
            'user_id' => \App\Models\User::factory(),
            'status' => 'pending',
            'total_amount' => $this->faker->randomFloat(2, 10, 1000),
            'currency' => $this->faker->randomElement(['npr', 'usd']),
        ];
    }
}
