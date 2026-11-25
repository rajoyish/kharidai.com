<?php

use App\Enums\PurchasePlatform;
use App\Services\Procurement\ShopLink;

it('expands shorthand into a full shop link', function (string $typed, string $saved) {
    expect(ShopLink::normalize($typed))->toBe($saved);
})->with([
    'telegram username' => ['@DanteHubBot', 'https://t.me/DanteHubBot'],
    'telegram link without scheme' => ['t.me/DanteHubBot', 'https://t.me/DanteHubBot'],
    'whatsapp number' => ['+977 9800000000', 'https://wa.me/9779800000000'],
    'bare website' => ['dantehub.com', 'https://dantehub.com'],
    'website with path' => ['www.dantehub.com/shop', 'https://www.dantehub.com/shop'],
    'full link kept' => ['https://discord.gg/dantehub', 'https://discord.gg/dantehub'],
]);

it('leaves something that is not a link as typed', function () {
    expect(ShopLink::normalize('javascript:alert(1)'))->toBe('javascript:alert(1)')
        ->and(ShopLink::normalize('   '))->toBeNull();
});

it('recognises the platform a link points at', function (string $url, PurchasePlatform $platform) {
    expect(ShopLink::platformFor($url))->toBe($platform);
})->with([
    ['https://t.me/DanteHubBot', PurchasePlatform::Telegram],
    ['https://wa.me/9779800000000', PurchasePlatform::WhatsApp],
    ['https://discord.gg/dantehub', PurchasePlatform::Discord],
    ['https://www.dantehub.com', PurchasePlatform::Website],
]);
