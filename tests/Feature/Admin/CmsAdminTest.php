<?php

use App\Models\Page;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('public');
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('renders the page create screen', function () {
    $this->actingAs($this->admin)
        ->get('/admin/pages/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Pages/Create'));
});

it('paginates the post index and shares the active search filter', function () {
    Post::factory()->count(16)->create();

    $this->actingAs($this->admin)
        ->get('/admin/posts')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Posts/Index')
            ->has('posts.data', 15)
            ->has('posts.links')
            ->where('filters.search', '')
        );
});

it('filters the post index by title on the server', function () {
    Post::factory()->create(['title' => 'Shipping update']);
    Post::factory()->create(['title' => 'Holiday sale']);

    $this->actingAs($this->admin)
        ->get('/admin/posts?search=shipping')
        ->assertInertia(fn (Assert $page) => $page
            ->has('posts.data', 1)
            ->where('posts.data.0.title', 'Shipping update')
            ->where('filters.search', 'shipping')
        );
});

it('renders the post create screen', function () {
    $this->actingAs($this->admin)
        ->get('/admin/posts/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Posts/Create'));
});

it('creates a page with a valid 1200x630 hero image', function () {
    $response = $this->actingAs($this->admin)->post('/admin/pages', [
        'title' => 'Privacy Policy',
        'content' => '<p>Our policy.</p>',
        'image' => UploadedFile::fake()->image('hero.jpg', 1200, 630),
        'image_alt' => 'Privacy hero',
        'seo_title' => 'Privacy | Kharidai',
        'seo_description' => 'How we handle your data.',
        'is_published' => true,
    ]);

    $response->assertRedirect('/admin/pages');

    $page = Page::firstWhere('slug', 'privacy-policy');

    expect($page)->not->toBeNull()
        ->and($page->seo_title)->toBe('Privacy | Kharidai')
        ->and($page->is_published)->toBeTrue();

    Storage::disk('public')->assertExists($page->image);
});

it('rejects a hero image that is not exactly 1200x630', function () {
    $this->actingAs($this->admin)
        ->post('/admin/pages', [
            'title' => 'Bad Image',
            'image' => UploadedFile::fake()->image('hero.jpg', 800, 600),
        ])
        ->assertSessionHasErrors('image');

    expect(Page::count())->toBe(0);
});

it('rejects a page slug that would shadow a first-party route', function () {
    $this->actingAs($this->admin)
        ->post('/admin/pages', ['title' => 'Blog', 'slug' => 'blog'])
        ->assertSessionHasErrors('slug');

    expect(Page::count())->toBe(0);
});

it('rejects a duplicate page slug', function () {
    Page::factory()->create(['slug' => 'privacy']);

    $this->actingAs($this->admin)
        ->post('/admin/pages', ['title' => 'Another', 'slug' => 'privacy'])
        ->assertSessionHasErrors('slug');
});

it('updates a page and replaces its hero image', function () {
    $page = Page::factory()->create([
        'title' => 'Old Title',
        'image' => UploadedFile::fake()->image('old.jpg', 1200, 630)->store('pages', 'public'),
    ]);
    $oldImage = $page->image;

    $this->actingAs($this->admin)
        ->put("/admin/pages/{$page->slug}", [
            'title' => 'New Title',
            'slug' => $page->slug,
            'image' => UploadedFile::fake()->image('new.jpg', 1200, 630),
            'is_published' => true,
        ])
        ->assertRedirect('/admin/pages');

    $page->refresh();

    expect($page->title)->toBe('New Title')
        ->and($page->image)->not->toBe($oldImage);

    Storage::disk('public')->assertMissing($oldImage);
    Storage::disk('public')->assertExists($page->image);
});

it('deletes a page and its hero image', function () {
    $page = Page::factory()->create([
        'image' => UploadedFile::fake()->image('hero.jpg', 1200, 630)->store('pages', 'public'),
    ]);

    $this->actingAs($this->admin)
        ->delete("/admin/pages/{$page->slug}")
        ->assertRedirect('/admin/pages');

    expect(Page::count())->toBe(0);
    Storage::disk('public')->assertMissing($page->image);
});

it('creates a post attributed to the signed in admin', function () {
    $this->actingAs($this->admin)
        ->post('/admin/posts', [
            'title' => 'Launch Day',
            'excerpt' => 'A short summary.',
            'content' => '<p>Body copy.</p>',
            'image' => UploadedFile::fake()->image('hero.jpg', 1200, 630),
            'is_published' => true,
        ])
        ->assertRedirect('/admin/posts');

    $post = Post::firstWhere('slug', 'launch-day');

    expect($post)->not->toBeNull()
        ->and($post->user_id)->toBe($this->admin->id)
        ->and($post->excerpt)->toBe('A short summary.');
});

it('allows a post slug that is reserved for pages', function () {
    // Posts live under /blog/{slug}, so they cannot collide with root routes.
    $this->actingAs($this->admin)
        ->post('/admin/posts', ['title' => 'Services', 'slug' => 'services'])
        ->assertSessionHasNoErrors();

    expect(Post::firstWhere('slug', 'services'))->not->toBeNull();
});

it('rejects a post hero image with the wrong dimensions', function () {
    $this->actingAs($this->admin)
        ->post('/admin/posts', [
            'title' => 'Bad Image',
            'image' => UploadedFile::fake()->image('hero.jpg', 1200, 800),
        ])
        ->assertSessionHasErrors('image');
});

it('links a page in the storefront nav once it is published', function () {
    $this->actingAs($this->admin)->post('/admin/pages', [
        'title' => 'Delivery Process',
        'content' => '<p>How delivery works.</p>',
        'is_published' => true,
    ])->assertRedirect('/admin/pages');

    $page = Page::firstWhere('slug', 'delivery-process');
    expect($page->is_published)->toBeTrue();

    $this->get('/')->assertInertia(fn ($inertia) => $inertia
        ->has('storefront.navPages', 1)
        ->where('storefront.navPages.0.slug', 'delivery-process')
    );

    $this->get('/delivery-process')->assertOk();
});

it('keeps a draft page out of the storefront nav', function () {
    $this->actingAs($this->admin)->post('/admin/pages', [
        'title' => 'Delivery Process',
        'content' => '<p>How delivery works.</p>',
        'is_published' => false,
    ])->assertRedirect('/admin/pages');

    $this->get('/')->assertInertia(fn ($inertia) => $inertia->has('storefront.navPages', 0));
    $this->get('/delivery-process')->assertNotFound();
});

it('treats a past publish date as still unpublished while the toggle is off', function () {
    // Mirrors the row created through the UI: a past date but the toggle left off.
    $this->actingAs($this->admin)->post('/admin/pages', [
        'title' => 'Delivery Process',
        'is_published' => false,
        'published_at' => '2010-04-12T15:24',
    ])->assertRedirect('/admin/pages');

    expect(Page::firstWhere('slug', 'delivery-process')->isPublished())->toBeFalse();
    $this->get('/')->assertInertia(fn ($inertia) => $inertia->has('storefront.navPages', 0));
});

it('appends a newly created page to the end of the menu', function () {
    Page::factory()->create(['slug' => 'first', 'sort_order' => 1]);
    Page::factory()->create(['slug' => 'second', 'sort_order' => 2]);

    $this->actingAs($this->admin)
        ->post('/admin/pages', ['title' => 'Third', 'is_published' => true])
        ->assertRedirect('/admin/pages');

    expect(Page::firstWhere('slug', 'third')->sort_order)->toBe(3);
});

it('reorders pages from the drag and drop table', function () {
    $about = Page::factory()->create(['slug' => 'about', 'sort_order' => 1]);
    $privacy = Page::factory()->create(['slug' => 'privacy', 'sort_order' => 2]);
    $delivery = Page::factory()->create(['slug' => 'delivery', 'sort_order' => 3]);

    $this->actingAs($this->admin)
        ->patch('/admin/pages/reorder', ['ids' => [$delivery->id, $about->id, $privacy->id]])
        ->assertRedirect();

    expect($delivery->fresh()->sort_order)->toBe(1)
        ->and($about->fresh()->sort_order)->toBe(2)
        ->and($privacy->fresh()->sort_order)->toBe(3);

    // The storefront menu reflects the new order immediately.
    $this->get('/')->assertInertia(fn ($inertia) => $inertia
        ->where('storefront.navPages.0.slug', 'delivery')
        ->where('storefront.navPages.2.slug', 'privacy')
    );
});

it('rejects a reorder payload referencing an unknown page', function () {
    $page = Page::factory()->create(['sort_order' => 1]);

    $this->actingAs($this->admin)
        ->patch('/admin/pages/reorder', ['ids' => [$page->id, 99999]])
        ->assertSessionHasErrors('ids.1');

    expect($page->fresh()->sort_order)->toBe(1);
});

it('does not treat the reorder route as a page slug', function () {
    // `pages/reorder` must not be captured by the `pages/{page}` resource route.
    Page::factory()->create(['slug' => 'reorder', 'sort_order' => 1]);

    $this->actingAs($this->admin)
        ->patch('/admin/pages/reorder', ['ids' => []])
        ->assertSessionHasErrors('ids');
});

it('toggles a page in and out of the main navigation', function () {
    $page = Page::factory()->create(['slug' => 'privacy']);

    $this->actingAs($this->admin)->patch("/admin/pages/{$page->slug}/toggle-nav");
    expect($page->fresh()->show_in_nav)->toBeFalse();
    // The footer is untouched.
    expect($page->fresh()->show_in_footer)->toBeTrue();

    $this->get('/')->assertInertia(fn ($inertia) => $inertia
        ->has('storefront.navPages', 0)
        ->has('storefront.footerPages', 1)
    );

    $this->actingAs($this->admin)->patch("/admin/pages/{$page->slug}/toggle-nav");
    expect($page->fresh()->show_in_nav)->toBeTrue();
});

it('toggles a page in and out of the footer', function () {
    $page = Page::factory()->create(['slug' => 'privacy']);

    $this->actingAs($this->admin)->patch("/admin/pages/{$page->slug}/toggle-footer");

    expect($page->fresh()->show_in_footer)->toBeFalse()
        ->and($page->fresh()->show_in_nav)->toBeTrue();

    $this->get('/')->assertInertia(fn ($inertia) => $inertia
        ->has('storefront.footerPages', 0)
        ->has('storefront.navPages', 1)
    );
});

it('blocks non-admins from reordering and toggling pages', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $page = Page::factory()->create(['slug' => 'privacy', 'sort_order' => 1]);

    $this->actingAs($user)->patch('/admin/pages/reorder', ['ids' => [$page->id]])->assertForbidden();
    $this->actingAs($user)->patch("/admin/pages/{$page->slug}/toggle-nav")->assertForbidden();
    $this->actingAs($user)->patch("/admin/pages/{$page->slug}/toggle-footer")->assertForbidden();

    expect($page->fresh()->show_in_nav)->toBeTrue();
});

it('stores an offset publish date as the matching utc instant', function () {
    // 18:15 in Kathmandu (UTC+05:45) is 12:30 UTC — already in the past.
    $this->travelTo('2026-07-09 12:35:00');

    $this->actingAs($this->admin)->post('/admin/posts', [
        'title' => 'Blog Title Is Here',
        'content' => '<p>Body.</p>',
        'is_published' => true,
        'published_at' => '2026-07-09T18:15:00+05:45',
    ])->assertRedirect('/admin/posts');

    $post = Post::firstWhere('slug', 'blog-title-is-here');

    expect($post->published_at->toDateTimeString())->toBe('2026-07-09 12:30:00')
        ->and($post->isPublished())->toBeTrue();

    // The reported symptom: the post is reachable, not a 404.
    $this->get('/blog/blog-title-is-here')->assertOk();
    $this->get('/blog')->assertInertia(fn ($inertia) => $inertia->has('posts.data', 1));
});

it('stores a utc publish date sent by the browser as an instant', function () {
    $this->travelTo('2026-07-09 12:35:00');

    $this->actingAs($this->admin)->post('/admin/posts', [
        'title' => 'Zulu Post',
        'is_published' => true,
        // What `Date.toISOString()` produces.
        'published_at' => '2026-07-09T12:30:00.000Z',
    ])->assertRedirect('/admin/posts');

    expect(Post::firstWhere('slug', 'zulu-post')->published_at->toDateTimeString())
        ->toBe('2026-07-09 12:30:00');
});

it('still schedules a genuinely future publish date', function () {
    $this->travelTo('2026-07-09 12:35:00');

    $this->actingAs($this->admin)->post('/admin/posts', [
        'title' => 'Future Post',
        'is_published' => true,
        'published_at' => '2026-07-10T18:15:00+05:45',
    ])->assertRedirect('/admin/posts');

    expect(Post::firstWhere('slug', 'future-post')->isPublished())->toBeFalse();
    $this->get('/blog/future-post')->assertNotFound();
});

it('publishes immediately when the publish date is left blank', function () {
    $this->actingAs($this->admin)->post('/admin/posts', [
        'title' => 'No Date Post',
        'is_published' => true,
        'published_at' => '',
    ])->assertRedirect('/admin/posts');

    $post = Post::firstWhere('slug', 'no-date-post');

    expect($post->published_at)->toBeNull()
        ->and($post->isPublished())->toBeTrue();
});

it('normalizes the publish date for pages too', function () {
    $this->travelTo('2026-07-09 12:35:00');

    $this->actingAs($this->admin)->post('/admin/pages', [
        'title' => 'Offset Page',
        'is_published' => true,
        'published_at' => '2026-07-09T18:15:00+05:45',
    ])->assertRedirect('/admin/pages');

    $page = Page::firstWhere('slug', 'offset-page');

    expect($page->published_at->toDateTimeString())->toBe('2026-07-09 12:30:00')
        ->and($page->isPublished())->toBeTrue();

    $this->get('/offset-page')->assertOk();
});

it('blocks non-admins from the cms admin routes', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)->get('/admin/pages')->assertForbidden();
    $this->actingAs($user)->get('/admin/posts')->assertForbidden();
});

it('requires authentication for the cms admin routes', function () {
    $this->get('/admin/pages')->assertRedirect('/login');
    $this->get('/admin/posts')->assertRedirect('/login');
});
