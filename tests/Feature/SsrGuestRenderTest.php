<?php

use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Symfony\Component\Process\Process;

/*
|--------------------------------------------------------------------------
| Guest SSR rendering
|--------------------------------------------------------------------------
|
| A throw inside a React component during SSR does not fail the request. Inertia
| catches it and quietly falls back to client-side rendering, so the route still
| answers 200 while shipping an empty root element and no indexable content —
| the page silently stops being server-rendered and nobody notices.
|
| Asserting on the status code, or on the <head> tags, would therefore prove
| nothing: `app.blade.php` renders the SEO meta itself, so those survive a failed
| render. The only marker a successful server render produces is the attribute
| Inertia stamps on the root element, so that is what these tests pin.
|
| These tests drive the real SSR bundle over a real Node process, and are skipped
| when the bundle has not been built.
*/

const SSR_RENDERED_MARKER = 'data-server-rendered="true"';

const SSR_CSR_FALLBACK_ROOT = '<div id="app"></div>';

/**
 * The port the test SSR server listens on. Deliberately not Inertia's default
 * 13714, so a dev SSR server left running does not serve these tests a stale
 * bundle (or get killed by them).
 */
const SSR_TEST_PORT = 13799;

/**
 * Boot one SSR server for the whole test process and hand back its URL. The
 * bundle is loaded once into a long-lived Node process in production, so reusing
 * a single process here matches how it actually runs — and keeps the Node
 * startup cost off every individual test.
 */
function ssrServerUrl(): string
{
    static $process = null;

    $url = 'http://127.0.0.1:'.SSR_TEST_PORT;

    if ($process instanceof Process && $process->isRunning()) {
        return $url;
    }

    $process = new Process(
        ['node', base_path('bootstrap/ssr/ssr.js')],
        base_path(),
        ['PORT' => (string) SSR_TEST_PORT],
    );

    $process->start();

    foreach (range(1, 50) as $ignored) {
        try {
            if (Http::timeout(1)->get($url.'/health')->successful()) {
                return $url;
            }
        } catch (Throwable) {
            // Still booting.
        }

        usleep(200_000);
    }

    $output = $process->getErrorOutput().$process->getOutput();
    $process->stop();

    throw new RuntimeException('SSR server never became ready: '.$output);
}

/**
 * Pull the Inertia page object back out of a server-rendered response, so a test
 * can re-render a different component against the real shared props rather than
 * a hand-built approximation of them.
 *
 * @return array<string, mixed>
 */
function inertiaPageObject(string $html): array
{
    $matched = preg_match(
        '/<script data-page="app" type="application\/json">(.*?)<\/script>/s',
        $html,
        $matches,
    );

    expect($matched)->toBe(1, 'Response carried no Inertia page object.');

    return json_decode($matches[1], associative: true, flags: JSON_THROW_ON_ERROR);
}

function expectServerRendered(TestResponse $response): void
{
    $response->assertOk();

    expect($response->getContent())
        ->toContain(SSR_RENDERED_MARKER)
        ->not->toContain(SSR_CSR_FALLBACK_ROOT);
}

beforeEach(function () {
    if (! file_exists(base_path('bootstrap/ssr/ssr.js'))) {
        $this->markTestSkipped('SSR bundle is not built — run `npm run build:ssr`.');
    }

    // phpunit.xml disables SSR for the rest of the suite, so opt this file back in.
    config([
        'inertia.ssr.enabled' => true,
        'inertia.ssr.url' => ssrServerUrl(),
    ]);
});

it('server-renders the routes a logged-out crawler can reach', function (string $uri) {
    expectServerRendered($this->get($uri));
})->with([
    'home' => '/',
    'blog index' => '/blog',
    'services' => '/services',
    'digital products' => '/digital-products',
    'physical products' => '/physical-products',
]);

it('server-renders a product detail page for a guest', function () {
    $product = Product::factory()->create();

    expectServerRendered($this->get(route('products.show', $product)));
});

it('server-renders a CMS page for a guest', function () {
    $page = Page::factory()->create();

    expectServerRendered($this->get('/'.$page->slug));
});

it('server-renders a blog post for a guest', function () {
    $post = Post::factory()->create();

    expectServerRendered($this->get(route('blog.show', $post)));
});

it('server-renders a page using the app layout when nobody is authenticated', function () {
    // Every guest-facing route currently overrides `.layout`, so none of them
    // reach AppLayout — which is exactly how AppSidebar came to dereference a
    // null `auth.user` unnoticed. `resolveLayout` returns AppLayout by *default*,
    // so the first guest page added without a `.layout` override would inherit it
    // and silently drop to client rendering. Drive the bundle directly to pin the
    // contract the routes above cannot: AppLayout must render for a guest.
    $page = inertiaPageObject($this->get('/')->getContent());

    $page['component'] = 'Admin/Posts/Create';
    $page['url'] = '/admin/posts/create';
    $page['props']['auth'] = ['user' => null];

    $response = Http::timeout(20)->post(ssrServerUrl().'/render', $page);

    expect($response->status())->toBe(200)
        ->and($response->json('body'))->not->toBeEmpty();
});
