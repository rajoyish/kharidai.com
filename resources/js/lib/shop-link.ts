/**
 * Live preview of how a typed shop link will be saved, and which platform it
 * points at. Mirrors App\Services\Procurement\ShopLink, which has the final
 * say on the server; keep the two in step.
 */

const TELEGRAM_USERNAME = /^@([A-Za-z0-9_]{3,32})$/;
const PHONE_NUMBER = /^\+(\d{7,15})$/;
const BARE_LINK = /^(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:[/?#]\S*)?$/;

/** "@DanteHubBot" -> "https://t.me/DanteHubBot", "dantehub.com" -> "https://dantehub.com". */
export function normalizeShopLink(input: string): string {
    const value = input.replace(/\s+/g, '');

    if (value === '') {
        return '';
    }

    const username = value.match(TELEGRAM_USERNAME);

    if (username) {
        return `https://t.me/${username[1]}`;
    }

    const phone = value.match(PHONE_NUMBER);

    if (phone) {
        return `https://wa.me/${phone[1]}`;
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    return BARE_LINK.test(value) ? `https://${value}` : value;
}

/** The platform value a full link points at, or null when it is not a link. */
export function platformForShopLink(url: string): string | null {
    let host: string;

    try {
        host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return null;
    }

    if (['t.me', 'telegram.me', 'telegram.dog'].includes(host)) {
        return 'telegram';
    }

    if (
        [
            'wa.me',
            'whatsapp.com',
            'api.whatsapp.com',
            'chat.whatsapp.com',
        ].includes(host)
    ) {
        return 'whatsapp';
    }

    if (['discord.gg', 'discord.com', 'discordapp.com'].includes(host)) {
        return 'discord';
    }

    return 'website';
}
