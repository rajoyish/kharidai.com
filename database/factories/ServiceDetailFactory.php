<?php

namespace Database\Factories;

use App\Enums\AdvanceType;
use App\Enums\PricingStrategy;
use App\Models\Product;
use App\Models\ServiceDetail;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceDetail>
 */
class ServiceDetailFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory()->service(),
            'requires_brief' => true,
            'delivery_days' => $this->faker->numberBetween(3, 14),
            'revisions' => $this->faker->numberBetween(1, 3),
            'pricing_strategy' => PricingStrategy::PerHour,
            'pricing_config' => ['hourly_rate_npr' => 1500],
            'requires_contract' => false,
            'requires_advance' => false,
            'advance_type' => null,
            'advance_value' => null,
        ];
    }

    public function withoutBrief(): static
    {
        return $this->state(['requires_brief' => false]);
    }

    public function perHour(int $hourlyRate = 1500): static
    {
        return $this->state([
            'pricing_strategy' => PricingStrategy::PerHour,
            'pricing_config' => ['hourly_rate_npr' => $hourlyRate],
        ]);
    }

    public function perPage(int $coverRate = 500, int $innerRate = 80): static
    {
        return $this->state([
            'pricing_strategy' => PricingStrategy::PerPage,
            'pricing_config' => [
                'cover_rate_npr' => $coverRate,
                'inner_rate_npr' => $innerRate,
            ],
        ]);
    }

    /**
     * @param  list<array{key: string, label: string, price_npr: int}>|null  $tiers
     */
    public function tiered(?array $tiers = null): static
    {
        return $this->state([
            'pricing_strategy' => PricingStrategy::Tiered,
            'pricing_config' => ['tiers' => $tiers ?? $this->defaultTiers()],
        ]);
    }

    /**
     * @param  list<array{key: string, label: string, price_npr: int}>|null  $tiers
     */
    public function hybrid(int $hourlyRate = 2000, ?array $tiers = null): static
    {
        return $this->state([
            'pricing_strategy' => PricingStrategy::Hybrid,
            'pricing_config' => [
                'hourly_rate_npr' => $hourlyRate,
                'tiers' => $tiers ?? $this->defaultTiers(),
            ],
        ]);
    }

    public function requiringContract(): static
    {
        return $this->state(['requires_contract' => true]);
    }

    public function requiringAdvance(AdvanceType $type = AdvanceType::Fixed, int $value = 10000): static
    {
        return $this->state([
            'requires_advance' => true,
            'advance_type' => $type,
            'advance_value' => $value,
        ]);
    }

    /**
     * @return list<array{key: string, label: string, price_npr: int}>
     */
    private function defaultTiers(): array
    {
        return [
            ['key' => 'basic', 'label' => 'Basic', 'price_npr' => 15000],
            ['key' => 'standard', 'label' => 'Standard', 'price_npr' => 30000],
            ['key' => 'premium', 'label' => 'Premium', 'price_npr' => 60000],
        ];
    }
}
