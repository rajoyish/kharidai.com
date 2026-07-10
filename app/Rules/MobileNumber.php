<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Validates a WhatsApp-reachable mobile number.
 *
 * Nepali numbers are held to the carrier prefix allowlist below; everything
 * else is treated as an international number and must carry an explicit `+`
 * country code, because a bare foreign number is indistinguishable from a
 * mistyped local one.
 */
class MobileNumber implements ValidationRule
{
    /**
     * Nepal's E.164 country calling code.
     */
    public const NEPAL_COUNTRY_CODE = '977';

    /**
     * The national significant number length for Nepali mobiles.
     */
    private const NEPAL_NATIONAL_LENGTH = 10;

    /**
     * Mobile prefixes currently allocated to Nepali carriers. Mirrors
     * `validateNepaleseNumber()` in `resources/js/components/mobile-number-input.tsx`;
     * update both together when a new block is allocated.
     *
     * @var list<string>
     */
    private const NEPAL_MOBILE_PREFIXES = [
        // Nepal Telecom (NTC)
        '984', '985', '986', '974', '975', '976',
        // Ncell
        '980', '981', '982', '970', '971',
    ];

    /**
     * E.164 caps a full number at 15 digits, country code included.
     */
    private const E164_MAX_DIGITS = 15;

    /**
     * Below this a number cannot be a routable international mobile.
     */
    private const E164_MIN_DIGITS = 8;

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute field must be a valid mobile number.');

            return;
        }

        $clean = self::strip($value);

        if (preg_match('/^\+?\d+$/', $clean) !== 1) {
            $fail('The :attribute field may only contain digits, spaces, and an optional leading +.');

            return;
        }

        $digits = ltrim($clean, '+');

        if (self::isNepali($digits)) {
            $this->validateNepali($digits, $fail);

            return;
        }

        if (! str_starts_with($clean, '+')) {
            $fail('The :attribute field must be a 10-digit Nepali mobile number, or include a country code such as +1 555 123 4567.');

            return;
        }

        $length = strlen($digits);

        if ($length < self::E164_MIN_DIGITS || $length > self::E164_MAX_DIGITS) {
            $fail('The :attribute field must be between '.self::E164_MIN_DIGITS.' and '.self::E164_MAX_DIGITS.' digits, including the country code.');
        }
    }

    /**
     * Normalize a number to the digits-only, country-code-prefixed form that
     * `https://wa.me/` expects, e.g. `9779740820005`. Returns null when the
     * value is blank. Assumes the value has already passed validation.
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = ltrim(self::strip($value), '+');

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, self::NEPAL_COUNTRY_CODE)) {
            return $digits;
        }

        if (strlen($digits) === self::NEPAL_NATIONAL_LENGTH) {
            return self::NEPAL_COUNTRY_CODE.$digits;
        }

        return $digits;
    }

    /**
     * Strip the separators people type into phone fields.
     */
    private static function strip(string $value): string
    {
        return (string) preg_replace('/[\s\-()]/', '', trim($value));
    }

    /**
     * A number is Nepali when it carries the 977 country code, or when it is a
     * bare national-length number that therefore cannot be anything else.
     */
    private static function isNepali(string $digits): bool
    {
        return str_starts_with($digits, self::NEPAL_COUNTRY_CODE)
            || strlen($digits) === self::NEPAL_NATIONAL_LENGTH;
    }

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    private function validateNepali(string $digits, Closure $fail): void
    {
        $national = str_starts_with($digits, self::NEPAL_COUNTRY_CODE)
            ? substr($digits, strlen(self::NEPAL_COUNTRY_CODE))
            : $digits;

        if (strlen($national) !== self::NEPAL_NATIONAL_LENGTH) {
            $fail('The :attribute field must be a 10-digit Nepali mobile number.');

            return;
        }

        if (preg_match('/^('.implode('|', self::NEPAL_MOBILE_PREFIXES).')\d{7}$/', $national) !== 1) {
            $fail('The :attribute field must be a valid NTC or Ncell mobile number.');
        }
    }
}
