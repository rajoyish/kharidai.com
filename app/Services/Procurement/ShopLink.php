<?php

namespace App\Services\Procurement;

use App\Enums\PurchasePlatform;

/**
 * Turns what an admin types as a supplier's shop link into a full URL, and
 * recognises which platform it points at.
 *
 * Shorthand is expanded rather than rejected: "@DanteHubBot" is a Telegram
 * username, "+9779800000000" a WhatsApp number, and "dantehub.com" a website
 * missing its scheme. Anything that still is not an http(s) link is returned
 * as typed so validation can reject it.
 *
 * The frontend mirrors these rules for a live preview in
 * resources/js/lib/shop-link.ts; keep the two in step.
 */
class ShopLink
{
    private const TELEGRAM_USERNAME = '/^@([A-Za-z0-9_]{3,32})$/';

    private const PHONE_NUMBER = '/^\+(\d{7,15})$/';

    private const BARE_LINK = '/^(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:[\/?#]\S*)?$/';

    public static function normalize(?string $input): ?string
    {
        $value = preg_replace('/\s+/', '', trim((string) $input)) ?? '';

        if ($value === '') {
            return null;
        }

        if (preg_match(self::TELEGRAM_USERNAME, $value, $match)) {
            return 'https://t.me/'.$match[1];
        }

        if (preg_match(self::PHONE_NUMBER, $value, $match)) {
            return 'https://wa.me/'.$match[1];
        }

        if (preg_match('#^https?://#i', $value)) {
            return $value;
        }

        if (preg_match(self::BARE_LINK, $value)) {
            return 'https://'.$value;
        }

        return $value;
    }

    /**
     * The platform a full link points at, or null when it is not a link.
     */
    public static function platformFor(?string $url): ?PurchasePlatform
    {
        $host = strtolower((string) parse_url((string) $url, PHP_URL_HOST));

        if ($host === '') {
            return null;
        }

        $host = preg_replace('/^www\./', '', $host);

        return match (true) {
            in_array($host, ['t.me', 'telegram.me', 'telegram.dog'], true) => PurchasePlatform::Telegram,
            in_array($host, ['wa.me', 'whatsapp.com', 'api.whatsapp.com', 'chat.whatsapp.com'], true) => PurchasePlatform::WhatsApp,
            in_array($host, ['discord.gg', 'discord.com', 'discordapp.com'], true) => PurchasePlatform::Discord,
            default => PurchasePlatform::Website,
        };
    }
}
