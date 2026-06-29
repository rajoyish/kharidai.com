<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
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
            'order_number' => 'ORD-'.strtoupper($this->faker->lexify('??????????')),
            'user_id' => User::factory(),
            'status' => 'pending',
            'total_amount' => $this->faker->randomFloat(2, 10, 1000),
        ];
    }
}
