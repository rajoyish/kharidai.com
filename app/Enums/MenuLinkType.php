<?php

namespace App\Enums;

/**
 * How a menu item resolves its destination: either a hand-typed URL, or a
 * reference to a CMS page whose slug is followed wherever the page moves.
 */
enum MenuLinkType: string
{
    case Custom = 'custom';
    case Page = 'page';

    public function label(): string
    {
        return match ($this) {
            self::Custom => 'Custom URL',
            self::Page => 'Page',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $type): string => $type->value, self::cases());
    }
}
