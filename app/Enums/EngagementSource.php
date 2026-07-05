<?php

namespace App\Enums;

enum EngagementSource: string
{
    case Storefront = 'storefront';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Storefront => 'Storefront order',
            self::Admin => 'Admin assigned',
        };
    }
}
