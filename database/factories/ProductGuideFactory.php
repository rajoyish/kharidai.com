<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductGuide;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductGuide>
 */
class ProductGuideFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'title' => rtrim(fake()->sentence(4), '.'),
            'content' => '<p>'.implode('</p><p>', (array) fake()->paragraphs(3)).'</p>',
            'is_published' => true,
            'sort_order' => 0,
        ];
    }

    public function draft(): static
    {
        return $this->state(['is_published' => false]);
    }
}
