<?php

namespace App\Services\Pricing;

trait ResolvesTiers
{
    /**
     * Validation rules for a `tiers` array on a pricing config.
     *
     * @return array<string, mixed>
     */
    protected function tierConfigRules(): array
    {
        return [
            'tiers' => ['required', 'array', 'min:1'],
            'tiers.*.key' => ['required', 'string', 'max:50'],
            'tiers.*.label' => ['required', 'string', 'max:120'],
            'tiers.*.price_npr' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * Invoice line-item rows, one per configured tier, each priced at the tier's
     * flat price with a starting quantity of one.
     *
     * @param  array<int, array<string, mixed>>  $tiers
     * @return list<array{label: string, quantity: float, unit_price_npr: float}>
     */
    protected function tierLineItems(array $tiers): array
    {
        return array_map(fn (array $tier): array => [
            'label' => (string) ($tier['label'] ?? $tier['key'] ?? 'Package'),
            'quantity' => 1.0,
            'unit_price_npr' => (float) ($tier['price_npr'] ?? 0),
        ], array_values($tiers));
    }

    /**
     * The NPR price of the tier matching $key, or 0 when it cannot be found.
     *
     * @param  array<int, array<string, mixed>>  $tiers
     */
    protected function priceForTier(array $tiers, ?string $key): float
    {
        foreach ($tiers as $tier) {
            if (($tier['key'] ?? null) === $key) {
                return (float) ($tier['price_npr'] ?? 0);
            }
        }

        return 0.0;
    }
}
