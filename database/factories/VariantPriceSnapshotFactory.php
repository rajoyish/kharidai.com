<?php

namespace Database\Factories;

use App\Enums\PriceSnapshotSource;
use App\Models\ProductVariant;
use App\Models\VariantPriceSnapshot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VariantPriceSnapshot>
 */
class VariantPriceSnapshotFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_variant_id' => ProductVariant::factory(),
            'source' => PriceSnapshotSource::Manual,
            'selling_price_npr' => $this->faker->randomFloat(2, 100, 10000),
            'purchase_price_npr' => $this->faker->randomFloat(2, 50, 5000),
        ];
    }
}
