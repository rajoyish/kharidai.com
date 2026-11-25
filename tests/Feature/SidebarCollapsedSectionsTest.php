<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * Folded sidebar sections are read on the server from an unencrypted cookie
 * (see `bootstrap/app.php`) so SSR renders them folded and the client hydrates
 * without a mismatch. The JavaScript that writes the cookie cannot encrypt it.
 */
it('shares the sidebar sections folded in the cookie', function () {
    $this->actingAs(User::factory()->create())
        ->withUnencryptedCookie('sidebar_collapsed_sections', 'sales,content')
        ->get(route('orders.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('sidebarCollapsedSections', ['sales', 'content']));
});

it('shares no folded sidebar sections without the cookie', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('orders.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('sidebarCollapsedSections', []));
});

it('drops malformed and repeated keys from the folded sections cookie', function () {
    $this->actingAs(User::factory()->create())
        ->withUnencryptedCookie('sidebar_collapsed_sections', 'sales,<script>,Sales,sales,,'.str_repeat('a', 40).',content')
        ->get(route('orders.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('sidebarCollapsedSections', ['sales', 'content']));
});
