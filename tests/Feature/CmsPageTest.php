<?php

use App\Models\Page;
use App\Models\Post;
use Inertia\Testing\AssertableInertia;

it('serves a published page from the site root', function () {
    $page = Page::factory()->create(['title' => 'Privacy Policy', 'slug' => 'privacy']);

    $this->get('/privacy')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia
            ->component('Pages/Show')
            ->where('page.title', 'Privacy Policy')
            ->where('page.slug', 'privacy')
        );

    expect($page->isPublished())->toBeTrue();
});

it('returns 404 for a draft page', function () {
    Page::factory()->draft()->create(['slug' => 'delivery']);

    $this->get('/delivery')->assertNotFound();
});

it('returns 404 for a page scheduled in the future', function () {
    Page::factory()->scheduled()->create(['slug' => 'deals']);

    $this->get('/deals')->assertNotFound();
});

it('returns 404 for an unknown slug', function () {
    $this->get('/does-not-exist')->assertNotFound();
});

it('marks page routes as indexable', function () {
    Page::factory()->create(['slug' => 'contact-us']);

    $this->get('/contact-us')
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia->where('seo.robots', 'index,follow'));
});

it('renders page-specific SEO metadata for social crawlers', function () {
    $page = Page::factory()->create([
        'title' => 'Privacy Policy',
        'slug' => 'privacy-policy',
        'seo_title' => 'Our Privacy Policy',
        'seo_description' => 'How Kharidai handles your data.',
    ]);

    $this->get('/privacy-policy')
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia
            ->where('seo.title', 'Our Privacy Policy - '.config('app.name'))
            ->where('seo.description', 'How Kharidai handles your data.')
            ->where('seo.type', 'article')
            ->where('seo.url', route('pages.show', $page))
            ->has('seo.image')
        );
});

it('derives page SEO metadata from the title and content when not set', function () {
    Page::factory()->create([
        'title' => 'Delivery',
        'slug' => 'delivery',
        'content' => '<p>We deliver across Nepal within three days.</p>',
        'seo_title' => null,
        'seo_description' => null,
    ]);

    $this->get('/delivery')
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia
            ->where('seo.title', 'Delivery - '.config('app.name'))
            ->where('seo.description', 'We deliver across Nepal within three days.')
        );
});

it('never lets the root catch-all shadow first-party routes', function () {
    // Even if these rows exist, the earlier-registered routes must win.
    Page::factory()->create(['title' => 'Fake Blog', 'slug' => 'blog']);
    Page::factory()->create(['title' => 'Fake Services', 'slug' => 'services']);

    $this->get('/blog')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia->component('Blog/Index'));

    $this->get('/services')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia->component('Storefront/Services'));
});

it('shares only published pages with the storefront header and footer', function () {
    Page::factory()->create(['title' => 'Privacy', 'slug' => 'privacy']);
    Page::factory()->create(['title' => 'Delivery', 'slug' => 'delivery']);
    Page::factory()->draft()->create(['title' => 'Hidden Draft', 'slug' => 'draft-page']);
    Page::factory()->scheduled()->create(['title' => 'Future', 'slug' => 'future-page']);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia
            ->has('storefront.navPages', 2)
            ->has('storefront.footerPages', 2)
        );
});

it('shares storefront pages in menu order, not creation order', function () {
    Page::factory()->create(['slug' => 'about', 'sort_order' => 3]);
    Page::factory()->create(['slug' => 'privacy', 'sort_order' => 1]);
    Page::factory()->create(['slug' => 'delivery', 'sort_order' => 2]);

    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->where('storefront.navPages.0.slug', 'privacy')
        ->where('storefront.navPages.1.slug', 'delivery')
        ->where('storefront.navPages.2.slug', 'about')
        ->where('storefront.footerPages.0.slug', 'privacy')
    );
});

it('respects the per-surface visibility toggles', function () {
    Page::factory()->hiddenFromNav()->create(['slug' => 'footer-only']);
    Page::factory()->hiddenFromFooter()->create(['slug' => 'nav-only']);

    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->has('storefront.navPages', 1)
        ->where('storefront.navPages.0.slug', 'nav-only')
        ->has('storefront.footerPages', 1)
        ->where('storefront.footerPages.0.slug', 'footer-only')
    );
});

it('hides a page from both surfaces when both toggles are off', function () {
    Page::factory()->hiddenFromNav()->hiddenFromFooter()->create(['slug' => 'orphan']);

    // Still reachable by direct URL — the toggles only control menu placement.
    $this->get('/orphan')->assertOk();

    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->has('storefront.navPages', 0)
        ->has('storefront.footerPages', 0)
    );
});

it('does not leak the visibility flags to the client', function () {
    Page::factory()->create(['slug' => 'privacy']);

    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->has('storefront.navPages.0', fn (AssertableInertia $page) => $page
            ->hasAll(['title', 'slug'])
            ->missing('show_in_nav')
            ->missing('show_in_footer')
        )
    );
});

it('flags the blog as linkable once a published post exists', function () {
    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->where('storefront.hasBlogPosts', false)
    );

    Post::factory()->create();

    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->where('storefront.hasBlogPosts', true)
    );
});

it('does not flag the blog as linkable for drafts or scheduled posts', function () {
    Post::factory()->draft()->create();
    Post::factory()->scheduled()->create();

    $this->get('/')->assertInertia(fn (AssertableInertia $inertia) => $inertia
        ->where('storefront.hasBlogPosts', false)
    );
});

it('shares storefront pages on the blog and page routes', function () {
    Page::factory()->create(['slug' => 'privacy']);

    $this->get('/blog')
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia->has('storefront.navPages', 1));

    $this->get('/privacy')
        ->assertInertia(fn (AssertableInertia $inertia) => $inertia->has('storefront.navPages', 1));
});

it('does not match multi-segment or uppercase paths', function () {
    Page::factory()->create(['slug' => 'privacy']);

    $this->get('/privacy/nested')->assertNotFound();
});
