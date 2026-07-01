<?php

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('can view the homepage', function () {
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('seo.image', asset('kharidai_og.png')),
    );
});

it('renders the default og image tags in the app shell', function () {
    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertSee(
        sprintf(
            '<meta data-inertia="og:image" property="og:image" content="%s" />',
            asset('kharidai_og.png'),
        ),
        false,
    );
    $response->assertSee(
        sprintf(
            '<meta data-inertia="twitter:image" name="twitter:image" content="%s" />',
            asset('kharidai_og.png'),
        ),
        false,
    );
});

it('renders the echo config from cached configuration values', function () {
    config()->set('broadcasting.connections.pusher.frontend', [
        'key' => 'production-client-key',
        'cluster' => 'ap2',
        'wsHost' => 'ws-ap2.pusher.com',
        'wsPort' => 6001,
        'wssPort' => 6001,
        'forceTLS' => false,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertSee('window.EchoConfig = JSON.parse(', false);
    $response->assertSee('production-client-key');
    $response->assertSee('ws-ap2.pusher.com');
    $response->assertSee('6001');
});

it('does not render the echo config when the pusher key is missing', function () {
    config()->set('broadcasting.connections.pusher.frontend', [
        'key' => null,
        'cluster' => 'ap2',
        'wsHost' => 'ws-ap2.pusher.com',
        'wsPort' => 6001,
        'wssPort' => 6001,
        'forceTLS' => false,
    ]);

    $response = $this->get(route('home'));

    $response->assertSuccessful();
    $response->assertDontSee('window.EchoConfig =', false);
});

it('can view a single product page', function () {
    $product = Product::factory()->create([
        'title' => 'Test Product',
        'in_stock' => true,
    ]);

    $response = $this->get('/products/'.$product->slug);

    $response->assertSuccessful();
});
