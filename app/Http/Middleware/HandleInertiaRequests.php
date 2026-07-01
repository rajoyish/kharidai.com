<?php

namespace App\Http\Middleware;

use App\Models\Cart;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $siteName = config('app.name');

        return [
            ...parent::share($request),
            'name' => $siteName,
            'auth' => [
                'user' => $request->user(),
            ],
            'cartCount' => $request->user() ? Cart::where('user_id', $request->user()->id)->withSum('items', 'quantity')->first()?->items_sum_quantity ?? 0 : 0,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'seo' => [
                'name' => $siteName,
                'title' => $siteName,
                'description' => 'Shop digital goods, subscriptions, services, and physical products from Kharidai.',
                'image' => asset('kharidai_og.png'),
                'imageAlt' => $siteName.' marketplace preview',
                'url' => $request->url(),
                'type' => 'website',
                'robots' => $request->routeIs('home', 'products.show') ? 'index,follow' : 'noindex,nofollow',
                'twitterCard' => 'summary_large_image',
            ],
        ];
    }
}
