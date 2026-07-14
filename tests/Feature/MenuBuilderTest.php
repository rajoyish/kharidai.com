<?php

use App\Enums\MenuLinkType;
use App\Enums\MenuLocation;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('renders the menu builder for a location', function () {
    MenuItem::factory()->create(['label' => 'Support', 'location' => MenuLocation::Header]);
    MenuItem::factory()->footer()->create(['label' => 'Careers']);

    $this->actingAs($this->admin)
        ->get('/admin/menus?location=header')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Menus/Index')
            ->where('location', 'header')
            ->has('items', 1)
            ->where('items.0.label', 'Support')
        );
});

it('reports a published page link as resolving in the builder', function () {
    // The builder reads `resolveHref()`, which needs `is_published` and
    // `published_at`. Leaving them out of the eager load made every page-linked
    // item look unpublished, flagging healthy links as broken.
    $page = Page::factory()->create(['slug' => 'privacy']);
    MenuItem::factory()->forPage($page)->create(['label' => 'Privacy Policy']);

    $this->actingAs($this->admin)
        ->get('/admin/menus')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->where('items.0.label', 'Privacy Policy')
            ->where('items.0.href', '/privacy')
        );
});

it('still flags a draft page link as unresolvable in the builder', function () {
    $draft = Page::factory()->draft()->create();
    MenuItem::factory()->forPage($draft)->create();

    $this->actingAs($this->admin)
        ->get('/admin/menus')
        ->assertInertia(fn (Assert $inertia) => $inertia->where('items.0.href', null));
});

it('keeps a guest out of the menu builder', function () {
    $this->get('/admin/menus')->assertRedirect('/login');
});

it('keeps a non-admin out of the menu builder', function () {
    $this->actingAs(User::factory()->create())
        ->get('/admin/menus')
        ->assertForbidden();
});

it('adds a custom url item', function () {
    $this->actingAs($this->admin)
        ->post('/admin/menus', [
            'location' => 'header',
            'label' => 'Track order',
            'link_type' => 'custom',
            'url' => 'https://track.example.com',
            'opens_in_new_tab' => true,
        ])
        ->assertRedirect();

    $item = MenuItem::sole();

    expect($item->label)->toBe('Track order')
        ->and($item->link_type)->toBe(MenuLinkType::Custom)
        ->and($item->url)->toBe('https://track.example.com')
        ->and($item->page_id)->toBeNull()
        ->and($item->opens_in_new_tab)->toBeTrue()
        ->and($item->resolveHref())->toBe('https://track.example.com');
});

it('adds an item that links to a page', function () {
    $page = Page::factory()->create(['slug' => 'about-us']);

    $this->actingAs($this->admin)
        ->post('/admin/menus', [
            'location' => 'header',
            'label' => 'About',
            'link_type' => 'page',
            'page_id' => $page->id,
        ])
        ->assertRedirect();

    $item = MenuItem::sole();

    expect($item->page_id)->toBe($page->id)
        ->and($item->url)->toBeNull()
        ->and($item->resolveHref())->toBe('/about-us');
});

it('requires a page for a page item', function () {
    $this->actingAs($this->admin)
        ->post('/admin/menus', ['location' => 'header', 'label' => 'Broken', 'link_type' => 'page'])
        ->assertSessionHasErrors('page_id');
});

it('accepts a custom item with no url, so a parent can exist only to open its dropdown', function () {
    $this->actingAs($this->admin)
        ->post('/admin/menus', ['location' => 'header', 'label' => 'Policies', 'link_type' => 'custom'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(MenuItem::sole()->resolveHref())->toBeNull();
});

it('treats a placeholder hash url as no destination', function () {
    // Otherwise the parent counts as a real link and the header renders it
    // *inside its own dropdown*, repeating the label.
    $item = MenuItem::factory()->create(['url' => '#']);

    expect($item->resolveHref())->toBeNull();
});

it('renders a dropdown parent without repeating it inside its own dropdown', function () {
    $parent = MenuItem::factory()->create(['label' => 'Policies', 'url' => '#']);
    MenuItem::factory()->childOf($parent)->create(['label' => 'Privacy Policy', 'url' => '/privacy']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 1)
            ->where('storefront.menu.0.label', 'Policies')
            // No href means the header renders a bare trigger, so "Policies"
            // never appears as an entry within the panel it opens.
            ->where('storefront.menu.0.href', null)
            ->has('storefront.menu.0.children', 1)
            ->where('storefront.menu.0.children.0.label', 'Privacy Policy')
        );
});

it('drops a destinationless item that has no dropdown to justify it', function () {
    MenuItem::factory()->create(['label' => 'Dangling', 'url' => '']);
    MenuItem::factory()->create(['label' => 'Live', 'url' => '/live']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 1)
            ->where('storefront.menu.0.label', 'Live')
        );
});

it('drops the previous destination when an item switches link type', function () {
    $page = Page::factory()->create();
    $item = MenuItem::factory()->forPage($page)->create();

    $this->actingAs($this->admin)
        ->put("/admin/menus/{$item->id}", [
            'location' => 'header',
            'label' => 'Now custom',
            'link_type' => 'custom',
            'url' => '/services',
        ])
        ->assertRedirect();

    expect($item->refresh()->page_id)->toBeNull()
        ->and($item->url)->toBe('/services');
});

it('nests an item under a top-level parent', function () {
    $parent = MenuItem::factory()->create(['label' => 'Company']);

    $this->actingAs($this->admin)
        ->post('/admin/menus', [
            'location' => 'header',
            'label' => 'Careers',
            'link_type' => 'custom',
            'url' => '/careers',
            'parent_id' => $parent->id,
        ])
        ->assertRedirect();

    expect($parent->children()->pluck('label')->all())->toBe(['Careers']);
});

it('rejects nesting deeper than two levels', function () {
    $parent = MenuItem::factory()->create();
    $child = MenuItem::factory()->childOf($parent)->create();

    $this->actingAs($this->admin)
        ->post('/admin/menus', [
            'location' => 'header',
            'label' => 'Too deep',
            'link_type' => 'custom',
            'url' => '/deep',
            'parent_id' => $child->id,
        ])
        ->assertSessionHasErrors('parent_id');

    expect(MenuItem::count())->toBe(2);
});

it('rejects a parent from another menu', function () {
    $footerParent = MenuItem::factory()->footer()->create();

    $this->actingAs($this->admin)
        ->post('/admin/menus', [
            'location' => 'header',
            'label' => 'Orphan',
            'link_type' => 'custom',
            'url' => '/orphan',
            'parent_id' => $footerParent->id,
        ])
        ->assertSessionHasErrors('parent_id');
});

it('rejects nesting an item that already has children', function () {
    $parent = MenuItem::factory()->create();
    MenuItem::factory()->childOf($parent)->create();
    $other = MenuItem::factory()->create();

    $this->actingAs($this->admin)
        ->put("/admin/menus/{$parent->id}", [
            'location' => 'header',
            'label' => $parent->label,
            'link_type' => 'custom',
            'url' => '/company',
            'parent_id' => $other->id,
        ])
        ->assertSessionHasErrors('parent_id');

    expect($parent->refresh()->parent_id)->toBeNull();
});

it('reorders and re-parents a whole menu tree', function () {
    $first = MenuItem::factory()->create(['sort_order' => 1]);
    $second = MenuItem::factory()->create(['sort_order' => 2]);
    $third = MenuItem::factory()->create(['sort_order' => 3]);

    $this->actingAs($this->admin)
        ->patch('/admin/menus/reorder', [
            'location' => 'header',
            'tree' => [
                ['id' => $second->id, 'children' => [['id' => $third->id]]],
                ['id' => $first->id],
            ],
        ])
        ->assertRedirect();

    expect($second->refresh())->parent_id->toBeNull()->sort_order->toBe(1)
        ->and($first->refresh())->parent_id->toBeNull()->sort_order->toBe(2)
        ->and($third->refresh())->parent_id->toBe($second->id)->sort_order->toBe(1);
});

it('refuses to reorder items from another menu', function () {
    $header = MenuItem::factory()->create();
    $footer = MenuItem::factory()->footer()->create();

    $this->actingAs($this->admin)
        ->patch('/admin/menus/reorder', [
            'location' => 'header',
            'tree' => [['id' => $header->id], ['id' => $footer->id]],
        ])
        ->assertSessionHasErrors('tree');

    expect($footer->refresh()->location)->toBe(MenuLocation::Footer);
});

it('removes a nested dropdown along with its parent', function () {
    $parent = MenuItem::factory()->create();
    $child = MenuItem::factory()->childOf($parent)->create();

    $this->actingAs($this->admin)
        ->delete("/admin/menus/{$parent->id}")
        ->assertRedirect();

    expect(MenuItem::whereKey([$parent->id, $child->id])->exists())->toBeFalse();
});

it('removes menu items pointing at a deleted page', function () {
    $page = Page::factory()->create();
    $item = MenuItem::factory()->forPage($page)->create();

    $page->delete();

    expect(MenuItem::whereKey($item->id)->exists())->toBeFalse();
});

it('shares the built header menu with the storefront as a tree', function () {
    $parent = MenuItem::factory()->create(['label' => 'Company', 'url' => '/company']);
    MenuItem::factory()->childOf($parent)->create(['label' => 'Careers', 'url' => '/careers']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 1)
            ->where('storefront.menu.0.label', 'Company')
            ->where('storefront.menu.0.href', '/company')
            ->where('storefront.menu.0.opensInNewTab', false)
            ->has('storefront.menu.0.children', 1)
            ->where('storefront.menu.0.children.0.label', 'Careers')
            ->where('storefront.menu.0.children.0.href', '/careers')
        );
});

it('leaves the storefront menu empty when none is built, so the header falls back to the page list', function () {
    Page::factory()->create(['title' => 'Privacy']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 0)
            ->has('storefront.navPages', 1)
        );
});

it('hides inactive items from the storefront menu', function () {
    MenuItem::factory()->create(['label' => 'Live']);
    MenuItem::factory()->inactive()->create(['label' => 'Hidden']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 1)
            ->where('storefront.menu.0.label', 'Live')
        );
});

it('drops a menu item whose page is not published', function () {
    $draft = Page::factory()->draft()->create();
    MenuItem::factory()->forPage($draft)->create(['label' => 'Draft page']);
    MenuItem::factory()->create(['label' => 'Live']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 1)
            ->where('storefront.menu.0.label', 'Live')
        );
});

it('keeps a parent with no destination of its own when it still has a dropdown', function () {
    $draft = Page::factory()->draft()->create();
    $parent = MenuItem::factory()->forPage($draft)->create(['label' => 'Company']);
    MenuItem::factory()->childOf($parent)->create(['label' => 'Careers', 'url' => '/careers']);

    $this->get('/')
        ->assertInertia(fn (Assert $inertia) => $inertia
            ->has('storefront.menu', 1)
            ->where('storefront.menu.0.label', 'Company')
            ->where('storefront.menu.0.href', null)
            ->has('storefront.menu.0.children', 1)
        );
});

it('rebuilds the shared menu after an item changes', function () {
    $item = MenuItem::factory()->create(['label' => 'Before']);

    $this->get('/')->assertInertia(fn (Assert $inertia) => $inertia
        ->where('storefront.menu.0.label', 'Before'));

    $item->update(['label' => 'After']);

    $this->get('/')->assertInertia(fn (Assert $inertia) => $inertia
        ->where('storefront.menu.0.label', 'After'));
});

it('rebuilds the shared menu when a linked page changes its slug', function () {
    $page = Page::factory()->create(['slug' => 'old-slug']);
    MenuItem::factory()->forPage($page)->create();

    $this->get('/')->assertInertia(fn (Assert $inertia) => $inertia
        ->where('storefront.menu.0.href', '/old-slug'));

    $page->update(['slug' => 'new-slug']);

    $this->get('/')->assertInertia(fn (Assert $inertia) => $inertia
        ->where('storefront.menu.0.href', '/new-slug'));
});
