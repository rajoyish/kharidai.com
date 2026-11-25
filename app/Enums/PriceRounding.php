<?php

namespace App\Enums;

/**
 * How a calculated selling price is rounded before it is shown to shoppers.
 */
enum PriceRounding: string
{
    case None = 'none';
    case NearestRupee = 'nearest_1';
    case NearestTen = 'nearest_10';
    case EndingNine = 'ending_9';
    case EndingNinetyNine = 'ending_99';

    public function label(): string
    {
        return match ($this) {
            self::None => 'No rounding',
            self::NearestRupee => 'Round to Rs. 1',
            self::NearestTen => 'Round to Rs. 10',
            self::EndingNine => 'End in 9 (e.g. 889)',
            self::EndingNinetyNine => 'End in 99 (e.g. 899)',
        };
    }

    /**
     * Round an NPR amount, never below one rupee for the "ending in" styles.
     */
    public function apply(float $amount): float
    {
        return match ($this) {
            self::None => round($amount, 2),
            self::NearestRupee => round($amount),
            self::NearestTen => round($amount / 10) * 10,
            self::EndingNine => max(9.0, round(($amount + 1) / 10) * 10 - 1),
            self::EndingNinetyNine => max(99.0, round(($amount + 1) / 100) * 100 - 1),
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $rounding): string => $rounding->value, self::cases());
    }
}
