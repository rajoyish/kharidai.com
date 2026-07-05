<?php

namespace App\Enums;

enum ProductType: string
{
    case Digital = 'digital';
    case Physical = 'physical';
    case Service = 'service';

    /**
     * Human-readable label for display in the UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::Digital => 'Digital',
            self::Physical => 'Physical',
            self::Service => 'Service',
        };
    }

    /**
     * Plural, storefront-facing label used for navigation and page headings.
     */
    public function pluralLabel(): string
    {
        return match ($this) {
            self::Digital => 'Digital Products',
            self::Physical => 'Physical Products',
            self::Service => 'Services',
        };
    }

    /**
     * Short marketing tagline describing the type on storefront pages.
     */
    public function tagline(): string
    {
        return match ($this) {
            self::Digital => 'Software, subscriptions, and instant downloads delivered to your inbox.',
            self::Physical => 'Real products shipped straight to your door.',
            self::Service => 'Work with our trusted experts on bespoke, hands-on projects.',
        };
    }

    /**
     * All enum values as plain strings, useful for validation rules.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $type): string => $type->value, self::cases());
    }
}
