<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets the CDN answer public storefront pages for anonymous visitors.
 *
 * The origin renders a full page in well under half a second, but the hop
 * between the CDN edge and this host has been measured adding several seconds
 * on top. A logged-out visitor reading a product page needs nothing from the
 * origin that a stored copy cannot give them, so the response is marked
 * cacheable and the edge serves it without making the trip.
 */
class CacheGuestPagesAtEdge
{
    /**
     * Routes whose guest response is identical for every visitor.
     *
     * Deliberately its own list rather than the one `HandleInertiaRequests`
     * uses for storefront navigation: they coincide today, but "renders the
     * storefront chrome" and "is safe to hand to a stranger from a cache" are
     * different questions, and a page should only join this list by someone
     * deciding it belongs.
     *
     * @var list<string>
     */
    private const CACHEABLE_ROUTES = [
        'home',
        'categories.show',
        'products.show',
        'digital-products.index',
        'physical-products.index',
        'services.index',
        'blog.index',
        'blog.show',
        'pages.show',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $this->isCacheable($request, $response)) {
            return $response;
        }

        // Nothing that belongs to one visitor may survive into a shared copy.
        // A CDN told to cache the body will store `Set-Cookie` along with it and
        // then hand the same session to everyone who asks, so the cookies come
        // off before the response is ever marked public. Symfony clears its
        // queued cookies when this header is removed, not just the header.
        $response->headers->remove('Set-Cookie');

        // `max-age=0` keeps browsers revalidating, so a shopper who logs in is
        // never stuck looking at their own stale copy; `s-maxage` is what the
        // edge honours.
        $response->headers->set(
            'Cache-Control',
            sprintf('public, max-age=0, s-maxage=%d', (int) config('edge-cache.ttl')),
        );

        // Inertia varies the body on X-Inertia, and the encoding varies by
        // request. Anything else here (User-Agent especially) splits the cache
        // into near-useless fragments.
        $response->headers->set('Vary', 'X-Inertia, Accept-Encoding');

        return $response;
    }

    /**
     * A response may only be shared when it was built for nobody in particular.
     */
    private function isCacheable(Request $request, Response $response): bool
    {
        if (! config('edge-cache.enabled')) {
            return false;
        }

        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return false;
        }

        if ($request->user() !== null) {
            return false;
        }

        // A visitor who already carries a session may have flash data or a
        // half-finished action behind it. Only a request that arrives with no
        // session at all is answerable from a shared copy.
        //
        // The cookie bag is asked directly rather than through `hasCookie`,
        // which reports false for a cookie that is present but decrypted to
        // null. A session cookie this app cannot read is still a session
        // cookie, and erring toward "do not share" is the only safe direction.
        if ($request->cookies->has((string) config('session.cookie'))) {
            return false;
        }

        // Inertia XHR responses are JSON for one navigation, not the document
        // shell, and they carry the asset version handshake. Leave them alone.
        if ($request->hasHeader('X-Inertia')) {
            return false;
        }

        return $request->routeIs(...self::CACHEABLE_ROUTES);
    }
}
