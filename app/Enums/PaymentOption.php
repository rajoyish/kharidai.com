<?php

namespace App\Enums;

enum PaymentOption: string
{
    case Full = 'full';
    case ShippingOnly = 'shipping_only';

    public function label(): string
    {
        return match ($this) {
            self::Full => 'Pay full amount now',
            self::ShippingOnly => 'Pay shipping only (rest on delivery)',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $option): string => $option->value, self::cases());
    }
}
