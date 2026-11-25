<?php

namespace Database\Factories;

use App\Enums\PurchasePlatform;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Supplier>
 */
class SupplierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'platform' => PurchasePlatform::Telegram,
            'contact' => '@'.$this->faker->userName(),
            'voucher_currency' => 'USD',
        ];
    }
}
