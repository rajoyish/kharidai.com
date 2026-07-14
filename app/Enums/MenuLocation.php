<?php

namespace App\Enums;

/**
 * A surface a menu can be attached to. Each location holds its own independent
 * tree of `MenuItem` records.
 */
enum MenuLocation: string
{
    case Header = 'header';
    case Footer = 'footer';

    public function label(): string
    {
        return match ($this) {
            self::Header => 'Header',
            self::Footer => 'Footer',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $location): string => $location->value, self::cases());
    }
}
