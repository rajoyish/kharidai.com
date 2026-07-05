<?php

use App\Enums\PricingStrategy;
use App\Services\Pricing\HybridStrategy;
use App\Services\Pricing\PerHourStrategy;
use App\Services\Pricing\PerPageStrategy;
use App\Services\Pricing\TieredStrategy;

it('prices per-hour work by the recorded hours', function () {
    $cost = (new PerHourStrategy)->calculate(
        ['hourly_rate_npr' => 1500],
        ['hours' => 8],
    );

    expect($cost)->toBe(12000.0);
});

it('prices book layout by distinct cover and inner page rates', function () {
    $cost = (new PerPageStrategy)->calculate(
        ['cover_rate_npr' => 800, 'inner_rate_npr' => 100],
        ['cover_pages' => 1, 'inner_pages' => 50],
    );

    // 1 cover * 800 + 50 inner * 100
    expect($cost)->toBe(5800.0);
});

it('prices a tiered package by the chosen tier', function () {
    $tiers = [
        ['key' => 'basic', 'label' => 'Basic', 'price_npr' => 15000],
        ['key' => 'standard', 'label' => 'Standard', 'price_npr' => 30000],
    ];

    $cost = (new TieredStrategy)->calculate(['tiers' => $tiers], ['tier_key' => 'standard']);

    expect($cost)->toBe(30000.0);
});

it('prices a hybrid engagement by the hour', function () {
    $cost = (new HybridStrategy)->calculate(
        ['hourly_rate_npr' => 2000, 'tiers' => []],
        ['mode' => 'hourly', 'hours' => 10],
    );

    expect($cost)->toBe(20000.0);
});

it('prices a hybrid engagement by tier plus extra hours', function () {
    $config = [
        'hourly_rate_npr' => 2000,
        'tiers' => [['key' => 'basic', 'label' => 'Basic', 'price_npr' => 15000]],
    ];

    $cost = (new HybridStrategy)->calculate(
        $config,
        ['mode' => 'tiered', 'tier_key' => 'basic', 'extra_hours' => 3],
    );

    // 15000 tier + 3 * 2000 extra hours
    expect($cost)->toBe(21000.0);
});

it('returns zero for an unknown tier key', function () {
    $cost = (new TieredStrategy)->calculate(
        ['tiers' => [['key' => 'basic', 'label' => 'Basic', 'price_npr' => 15000]]],
        ['tier_key' => 'ghost'],
    );

    expect($cost)->toBe(0.0);
});

it('resolves each strategy from the enum', function () {
    expect(PricingStrategy::PerHour->calculator())->toBeInstanceOf(PerHourStrategy::class)
        ->and(PricingStrategy::PerPage->calculator())->toBeInstanceOf(PerPageStrategy::class)
        ->and(PricingStrategy::Tiered->calculator())->toBeInstanceOf(TieredStrategy::class)
        ->and(PricingStrategy::Hybrid->calculator())->toBeInstanceOf(HybridStrategy::class);
});
