<?php

namespace App\Services\Pricing;

/**
 * Fixed tiered packages: the admin picks the delivered tier after completion and
 * the cost is that tier's flat price.
 */
class TieredStrategy implements PricingStrategy
{
    use ResolvesTiers;

    /**
     * @return array<string, mixed>
     */
    public function configRules(): array
    {
        return $this->tierConfigRules();
    }

    /**
     * @return array<string, mixed>
     */
    public function measurementRules(): array
    {
        return [
            'tier_key' => ['required', 'string'],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $measurement
     */
    public function calculate(array $config, array $measurement): float
    {
        return round(
            $this->priceForTier($config['tiers'] ?? [], $measurement['tier_key'] ?? null),
            2,
        );
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<array{label: string, quantity: float, unit_price_npr: float}>
     */
    public function lineItemSuggestions(array $config): array
    {
        return $this->tierLineItems($config['tiers'] ?? []);
    }
}
