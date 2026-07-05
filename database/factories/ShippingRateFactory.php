<?php

namespace Database\Factories;

use App\Models\ShippingRate;
use App\Models\ShippingZone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShippingRate>
 */
class ShippingRateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shipping_zone_id' => ShippingZone::factory(),
            'base_fee_npr' => 100,
            'per_kg_fee_npr' => 50,
            'free_over_npr' => null,
            'min_days' => 2,
            'max_days' => 5,
        ];
    }
}
