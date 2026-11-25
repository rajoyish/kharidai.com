<?php

namespace App\Enums;

/**
 * Where an order is placed with a supplier.
 */
enum PurchasePlatform: string
{
    case Telegram = 'telegram';
    case WhatsApp = 'whatsapp';
    case Discord = 'discord';
    case Website = 'website';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Telegram => 'Telegram',
            self::WhatsApp => 'WhatsApp',
            self::Discord => 'Discord',
            self::Website => 'Website',
            self::Other => 'Other',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $platform): array => ['value' => $platform->value, 'label' => $platform->label()], self::cases());
    }
}
