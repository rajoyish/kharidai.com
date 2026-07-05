<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shipment>
 */
class ShipmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'status' => 'pending',
            'recipient_name' => $this->faker->name(),
            'mobile_number' => $this->faker->numerify('98########'),
            'address_line' => $this->faker->streetAddress(),
            'city' => $this->faker->city(),
            'landmark' => $this->faker->optional()->word(),
            'zone_name' => 'Inside Kathmandu Valley',
            'tracking_note' => null,
        ];
    }
}
