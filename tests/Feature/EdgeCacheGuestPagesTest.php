<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Edge caching guest storefront pages
|--------------------------------------------------------------------------
|
| Marking a response public tells a CDN it may hand the same bytes to everyone
| who asks. The tests that matter here are the ones proving it does NOT happen:
| a response built for a signed-in visitor, or one carrying a session, must
| never pick up a `public` cache header, and a shared response must never leave
| with a Set-Cookie on it.
|
*/

function cacheControl(TestResponse $response): string
{
    return (string) $response->headers->get('Cache-Control');
}

it('does not mark anything cacheable while the feature is off', function () {
    config(['edge-cache.enabled' => false]);

    $response = $this->get('/');

    $response->assertOk();
    expect(cacheControl($response))->not->toContain('s-maxage');
});

it('marks a guest storefront page cacheable by the edge', function () {
    config(['edge-cache.enabled' => true, 'edge-cache.ttl' => 300]);

    $response = $this->get('/');

    $response->assertOk();
    expect(cacheControl($response))
        ->toContain('public')
        ->toContain('s-maxage=300')
        ->toContain('max-age=0');
});

it('strips cookies from a response the edge is allowed to share', function () {
    config(['edge-cache.enabled' => true]);

    $response = $this->get('/');

    // A stored Set-Cookie would hand one visitor's session to every later one.
    expect($response->headers->get('Set-Cookie'))->toBeNull();
    expect($response->headers->getCookies())->toBeEmpty();
});

it('never caches a page rendered for a signed-in user', function () {
    config(['edge-cache.enabled' => true]);

    $response = $this->actingAs(User::factory()->create())->get('/');

    $response->assertOk();
    expect(cacheControl($response))->not->toContain('s-maxage');
    expect($response->headers->get('Set-Cookie'))->not->toBeNull();
});

it('never caches a request that already carries a session', function () {
    config(['edge-cache.enabled' => true]);

    $response = $this->withUnencryptedCookie(config('session.cookie'), 'existing-session')
        ->get('/');

    $response->assertOk();
    expect(cacheControl($response))->not->toContain('s-maxage');
});

it('leaves Inertia XHR responses uncached', function () {
    config(['edge-cache.enabled' => true]);

    $version = $this->withHeader('X-Inertia', 'true')
        ->get('/')
        ->headers->get('x-inertia-version');

    $response = $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version,
    ])->get('/');

    $response->assertOk();
    expect(cacheControl($response))->not->toContain('s-maxage');
});

it('leaves routes outside the storefront uncached', function () {
    config(['edge-cache.enabled' => true]);

    $response = $this->get('/login');

    $response->assertOk();
    expect(cacheControl($response))->not->toContain('s-maxage');
});

it('keeps the csrf priming route uncacheable and cookie-bearing', function () {
    config(['edge-cache.enabled' => true]);

    $response = $this->get(route('csrf-cookie'));

    $response->assertNoContent();
    expect(cacheControl($response))->not->toContain('s-maxage');
    expect($response->headers->getCookies())->not->toBeEmpty();
});
