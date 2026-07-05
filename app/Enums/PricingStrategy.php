<?php

namespace App\Enums;

use App\Services\Pricing\HybridStrategy;
use App\Services\Pricing\PerHourStrategy;
use App\Services\Pricing\PerPageStrategy;
use App\Services\Pricing\PricingStrategy as PricingStrategyContract;
use App\Services\Pricing\TieredStrategy;

enum PricingStrategy: string
{
    case PerHour = 'per_hour';
    case PerPage = 'per_page';
    case Tiered = 'tiered';
    case Hybrid = 'hybrid';

    /**
     * Human-readable label for display in the UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::PerHour => 'Per hour',
            self::PerPage => 'Per page (cover / inner)',
            self::Tiered => 'Tiered packages',
            self::Hybrid => 'Hybrid (tiers + hourly)',
        };
    }

    /**
     * Resolve the calculator that knows how to price this strategy.
     */
    public function calculator(): PricingStrategyContract
    {
        return match ($this) {
            self::PerHour => new PerHourStrategy,
            self::PerPage => new PerPageStrategy,
            self::Tiered => new TieredStrategy,
            self::Hybrid => new HybridStrategy,
        };
    }

    /**
     * All enum values as plain strings, useful for validation rules.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $strategy): string => $strategy->value, self::cases());
    }
}
