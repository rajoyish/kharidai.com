<?php

namespace Database\Factories;

use App\Models\ShippingAddress;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShippingAddress>
 */
class ShippingAddressFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'shipping_zone_id' => ShippingZone::factory(),
            'recipient_name' => $this->faker->name(),
            'mobile_number' => $this->faker->numerify('98########'),
            'address_line' => $this->faker->streetAddress(),
            'city' => $this->faker->city(),
            'landmark' => $this->faker->optional()->word(),
            'is_default' => false,
        ];
    }
}
