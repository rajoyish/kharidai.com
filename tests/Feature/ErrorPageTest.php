<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('renders a missing page as the error page, keeping the 404 status', function () {
    $this->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ErrorPage')
            ->where('status', 404),
        );
});

it('renders a forbidden page with the visitor still signed in', function () {
    $customer = User::factory()->create(['is_admin' => false]);

    $this->actingAs($customer)
        ->get(route('admin.dashboard'))
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ErrorPage')
            ->where('status', 403)
            ->where('auth.user.id', $customer->id),
        );
});

it('shows another customer\'s order as the not found page', function () {
    $order = Order::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('orders.show', $order))
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->component('ErrorPage')->where('status', 404));
});

it('keeps JSON errors for API routes', function () {
    $this->getJson('/api/this-endpoint-does-not-exist')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});

it('renders a server error page only when not debugging', function (bool $debug) {
    config(['app.debug' => $debug]);
    Route::get('/__boom', fn () => throw new RuntimeException('Boom'));

    $response = $this->get('/__boom')->assertInternalServerError();

    if ($debug) {
        expect($response->headers->get('X-Inertia'))->toBeNull();
        $response->assertDontSee('"component":"ErrorPage"', false);
    } else {
        $response->assertInertia(fn (Assert $page) => $page->component('ErrorPage')->where('status', 500));
    }
})->with(['debugging' => true, 'production' => false]);

it('renders the error page for a URL that matches no route at all', function () {
    $this->post('/no/such/route/anywhere')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->component('ErrorPage')->where('status', 404));
});
