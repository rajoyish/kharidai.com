<?php

namespace App\Services\Pricing;

/**
 * Book layout style pricing: distinct per-page rates for the cover page versus
 * the inner pages, billed against the page counts measured after completion.
 */
class PerPageStrategy implements PricingStrategy
{
    /**
     * @return array<string, mixed>
     */
    public function configRules(): array
    {
        return [
            'cover_rate_npr' => ['required', 'numeric', 'min:0'],
            'inner_rate_npr' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function measurementRules(): array
    {
        return [
            'cover_pages' => ['required', 'integer', 'min:0'],
            'inner_pages' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $measurement
     */
    public function calculate(array $config, array $measurement): float
    {
        $coverRate = (float) ($config['cover_rate_npr'] ?? 0);
        $innerRate = (float) ($config['inner_rate_npr'] ?? 0);
        $coverPages = (int) ($measurement['cover_pages'] ?? 0);
        $innerPages = (int) ($measurement['inner_pages'] ?? 0);

        return round($coverRate * $coverPages + $innerRate * $innerPages, 2);
    }
}
