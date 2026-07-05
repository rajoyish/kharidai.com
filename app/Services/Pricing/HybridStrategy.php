<?php

namespace App\Services\Pricing;

/**
 * Video editing / web development style pricing: supports both a tiered package
 * table and a per-hour rate. The measurement's `mode` selects which applies;
 * tiered engagements may add billable `extra_hours` on top of the package.
 */
class HybridStrategy implements PricingStrategy
{
    use ResolvesTiers;

    public const MODE_HOURLY = 'hourly';

    public const MODE_TIERED = 'tiered';

    /**
     * @return array<string, mixed>
     */
    public function configRules(): array
    {
        return $this->tierConfigRules() + [
            'hourly_rate_npr' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function measurementRules(): array
    {
        return [
            'mode' => ['required', 'in:'.self::MODE_HOURLY.','.self::MODE_TIERED],
            'hours' => ['required_if:mode,'.self::MODE_HOURLY, 'nullable', 'numeric', 'min:0'],
            'tier_key' => ['required_if:mode,'.self::MODE_TIERED, 'nullable', 'string'],
            'extra_hours' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $measurement
     */
    public function calculate(array $config, array $measurement): float
    {
        $rate = (float) ($config['hourly_rate_npr'] ?? 0);
        $mode = $measurement['mode'] ?? self::MODE_TIERED;

        if ($mode === self::MODE_HOURLY) {
            return round($rate * (float) ($measurement['hours'] ?? 0), 2);
        }

        $tierPrice = $this->priceForTier($config['tiers'] ?? [], $measurement['tier_key'] ?? null);
        $extraHours = (float) ($measurement['extra_hours'] ?? 0);

        return round($tierPrice + $rate * $extraHours, 2);
    }
}
