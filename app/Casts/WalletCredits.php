<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Casts a wallet credit amount stored as integer hundred-millionths to an
 * exact decimal string with eight places, and back.
 *
 * Supplier balances carry eight decimal places (e.g. 8.09676294), which a
 * float cannot hold exactly. Storing whole units keeps every balance, lot and
 * allocation exact, and the string form never passes through a float.
 *
 * @implements CastsAttributes<string|null, string|int|float|null>
 */
class WalletCredits implements CastsAttributes
{
    /**
     * Stored units per one wallet credit.
     */
    public const SCALE = 100_000_000;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        return self::toDecimal((int) $value);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::toUnits($value);
    }

    /**
     * Parse a decimal credit amount into stored units without a float round
     * trip, so "8.09676294" stores exactly 809676294.
     */
    public static function toUnits(string|int|float $value): int
    {
        $decimal = is_float($value) ? sprintf('%.8F', $value) : trim((string) $value);
        $isNegative = str_starts_with($decimal, '-');
        $decimal = ltrim($decimal, '+-');

        [$whole, $fraction] = array_pad(explode('.', $decimal, 2), 2, '');
        $fraction = substr(str_pad($fraction, 8, '0'), 0, 8);

        $units = ((int) ($whole === '' ? '0' : $whole)) * self::SCALE + (int) $fraction;

        return $isNegative ? -$units : $units;
    }

    /**
     * Format stored units as an exact eight-place decimal string.
     */
    public static function toDecimal(int $units): string
    {
        $sign = $units < 0 ? '-' : '';
        $units = abs($units);

        return $sign.intdiv($units, self::SCALE).'.'.str_pad((string) ($units % self::SCALE), 8, '0', STR_PAD_LEFT);
    }
}
