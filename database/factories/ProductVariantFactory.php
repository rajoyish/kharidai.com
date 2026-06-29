<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => \App\Models\Product::factory(),
            'name' => $this->faker->word(),
            'price_npr' => $this->faker->randomFloat(2, 100, 10000),
            'price_usd' => $this->faker->randomFloat(2, 1, 100),
            'purchase_price_npr' => $this->faker->randomFloat(2, 50, 5000),
            'purchase_price_usd' => $this->faker->randomFloat(2, 0.5, 50),
        ];
    }
}
