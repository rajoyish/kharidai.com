<?php

namespace App\Services\Pricing;

/**
 * Logo / graphic design style pricing: a flat hourly rate billed against the
 * hours actually worked, measured after completion.
 */
class PerHourStrategy implements PricingStrategy
{
    /**
     * @return array<string, mixed>
     */
    public function configRules(): array
    {
        return [
            'hourly_rate_npr' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function measurementRules(): array
    {
        return [
            'hours' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $measurement
     */
    public function calculate(array $config, array $measurement): float
    {
        $rate = (float) ($config['hourly_rate_npr'] ?? 0);
        $hours = (float) ($measurement['hours'] ?? 0);

        return round($rate * $hours, 2);
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<array{label: string, quantity: float, unit_price_npr: float}>
     */
    public function lineItemSuggestions(array $config): array
    {
        return [
            ['label' => 'Hours', 'quantity' => 0.0, 'unit_price_npr' => (float) ($config['hourly_rate_npr'] ?? 0)],
        ];
    }
}
