<?php

namespace Database\Factories;

use App\Models\PhysicalProductDetail;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PhysicalProductDetail>
 */
class PhysicalProductDetailFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory()->physical(),
            'weight_kg' => $this->faker->randomFloat(2, 0.2, 2),
            'flat_shipping_npr' => null,
            'free_shipping' => false,
        ];
    }

    public function freeShipping(): static
    {
        return $this->state(['free_shipping' => true]);
    }

    public function flatShipping(float $npr): static
    {
        return $this->state(['flat_shipping_npr' => $npr]);
    }
}
