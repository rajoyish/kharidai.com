<?php

namespace Database\Factories;

use App\Enums\ProductType;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => ProductType::Digital,
            'title' => $this->faker->words(3, true),
            'description' => $this->faker->paragraph(),
            'image_alt' => null,
            'seo_title' => null,
            'seo_description' => null,
            'in_stock' => true,
            'is_visible' => true,
        ];
    }

    public function physical(): static
    {
        return $this->state(['type' => ProductType::Physical]);
    }

    public function service(): static
    {
        return $this->state(['type' => ProductType::Service]);
    }

    public function hidden(): static
    {
        return $this->state(['is_visible' => false]);
    }
}
