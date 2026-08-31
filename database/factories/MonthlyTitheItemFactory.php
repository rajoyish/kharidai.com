<?php

namespace Database\Factories;

use App\Models\MonthlyTithe;
use App\Models\MonthlyTitheItem;
use App\Models\Order;
use App\Models\ServiceEngagement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MonthlyTitheItem>
 */
class MonthlyTitheItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'monthly_tithe_id' => MonthlyTithe::factory(),
            'order_id' => Order::factory(),
            'service_engagement_id' => null,
            'is_paid' => false,
            'paid_at' => null,
        ];
    }

    public function forService(?ServiceEngagement $engagement = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'order_id' => null,
            'service_engagement_id' => $engagement?->id ?? ServiceEngagement::factory(),
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_paid' => true,
            'paid_at' => now(),
        ]);
    }
}
