<?php

const GA_MEASUREMENT_ID = 'G-1K0F7REGRV';

const META_PIXEL_ID = '2087629375156375';

it('renders the Google tag in production', function () {
    $this->app->detectEnvironment(fn () => 'production');

    $this->get('/')
        ->assertOk()
        ->assertSee('googletagmanager.com/gtag/js?id='.GA_MEASUREMENT_ID, escape: false)
        ->assertSee("gtag('config', '".GA_MEASUREMENT_ID."')", escape: false);
});

it('renders the Meta Pixel in production', function () {
    $this->app->detectEnvironment(fn () => 'production');

    $this->get('/')
        ->assertOk()
        ->assertSee("fbq('init', '".META_PIXEL_ID."')", escape: false)
        ->assertSee("fbq('track', 'PageView')", escape: false)
        ->assertSee('facebook.com/tr?id='.META_PIXEL_ID, escape: false);
});

it('does not render any analytics tags outside production', function () {
    $response = $this->get('/')->assertOk();

    $response->assertDontSee('googletagmanager.com', escape: false)
        ->assertDontSee('connect.facebook.net', escape: false)
        ->assertDontSee('fbq(', escape: false);
});

it('never hardcodes the Meta Conversions API token', function () {
    // The token is a write-capable secret. It belongs in the environment, never in
    // a tracked file — this pins that the config only ever reads it from env.
    expect(file_get_contents(config_path('services.php')))
        ->not->toContain('EAA')
        ->and(config('services.meta.conversions_api_token'))
        ->toBe(env('META_CONVERSIONS_API_TOKEN'));
});
