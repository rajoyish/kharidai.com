<?php

use Illuminate\Testing\TestResponse;

/**
 * The opening `<html>` tag of a server-rendered response, which is where the
 * appearance cookie decides whether the document starts out dark.
 */
function htmlTag(TestResponse $response): string
{
    preg_match('/<html\b[^>]*>/', $response->getContent(), $matches);

    return $matches[0] ?? '';
}

/**
 * The theme is chosen on the server from an unencrypted `appearance` cookie
 * (see `bootstrap/app.php`), so that the very first paint is already in the
 * right theme. Encrypting it would make it undecryptable by the JavaScript that
 * writes it, and the page would flash white before React caught up.
 */
it('renders the document dark when the appearance cookie says dark', function () {
    $response = $this->withUnencryptedCookie('appearance', 'dark')
        ->get(route('home'));

    $response->assertOk();

    expect(htmlTag($response))->toContain('dark');
});

it('renders the document light when the appearance cookie says light', function () {
    $response = $this->withUnencryptedCookie('appearance', 'light')
        ->get(route('home'));

    $response->assertOk();

    expect(htmlTag($response))->not->toContain('dark');
});

/**
 * "System" cannot be resolved on the server — only the browser knows the OS
 * preference — so the server stays light and defers to the inline script that
 * consults `prefers-color-scheme` before the first paint.
 */
it('defers to prefers-color-scheme when the appearance cookie says system', function () {
    $response = $this->withUnencryptedCookie('appearance', 'system')
        ->get(route('home'));

    $response->assertOk();

    expect(htmlTag($response))->not->toContain('dark');

    $response->assertSee('prefers-color-scheme: dark', false);
});

it('treats a visitor with no appearance cookie as system', function () {
    $response = $this->get(route('home'));

    $response->assertOk();

    expect(htmlTag($response))->not->toContain('dark');

    $response->assertSee('prefers-color-scheme: dark', false);
});
