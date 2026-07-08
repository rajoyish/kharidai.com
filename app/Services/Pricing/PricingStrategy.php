<?php

namespace App\Services\Pricing;

/**
 * A pricing strategy knows how to validate a service's stored pricing rules
 * ({@see configRules()}), validate a post-completion measurement submission
 * ({@see measurementRules()}), and turn the two into a final cost in NPR
 * ({@see calculate()}).
 *
 * All money is expressed in whole NPR (rupees); the ledger columns on the
 * models convert to/from paisa via their accessors.
 */
interface PricingStrategy
{
    /**
     * Validation rules for the service's `pricing_config`.
     *
     * @return array<string, mixed>
     */
    public function configRules(): array;

    /**
     * Validation rules for a measurement submitted at cost-calculation time.
     *
     * @return array<string, mixed>
     */
    public function measurementRules(): array;

    /**
     * The final cost in NPR for the given stored config and recorded measurement.
     *
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $measurement
     */
    public function calculate(array $config, array $measurement): float;

    /**
     * Suggested invoice line items derived from the stored `pricing_config`, used
     * to seed the admin's editable invoice brief. Each row carries a label and a
     * unit price (in whole NPR); quantities start at zero for the admin to fill.
     *
     * @param  array<string, mixed>  $config
     * @return list<array{label: string, quantity: float, unit_price_npr: float}>
     */
    public function lineItemSuggestions(array $config): array;
}
