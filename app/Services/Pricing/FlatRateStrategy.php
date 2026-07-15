<?php

namespace App\Services\Pricing;

/**
 * Flat rate pricing: a single fixed base fee for the whole engagement,
 * charged regardless of hours worked or pages produced. There is nothing to
 * measure after completion — the cost is always the configured base fee.
 */
class FlatRateStrategy implements PricingStrategy
{
    /**
     * @return array<string, mixed>
     */
    public function configRules(): array
    {
        return [
            'base_fee_npr' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function measurementRules(): array
    {
        return [];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $measurement
     */
    public function calculate(array $config, array $measurement): float
    {
        return round((float) ($config['base_fee_npr'] ?? 0), 2);
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<array{label: string, quantity: float, unit_price_npr: float}>
     */
    public function lineItemSuggestions(array $config): array
    {
        return [
            ['label' => 'Base Fee', 'quantity' => 1.0, 'unit_price_npr' => (float) ($config['base_fee_npr'] ?? 0)],
        ];
    }
}
