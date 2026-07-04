<?php

namespace App\Http\Middleware;

use App\Models\Cart;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
                'user' => $request->user() ? $request->user()->only('id', 'name', 'email', 'avatar', 'is_admin') : null,
            ],
            'cartCount' => $request->user()
                ? (int) (Cart::where('user_id', $request->user()->id)->withSum('items', 'quantity')->first()?->items_sum_quantity ?? 0)
                : 0,
            'storefront' => fn () => [
                'categories' => Cache::rememberForever(
                    Category::STOREFRONT_NAVIGATION_CACHE_KEY,
                    fn () => Category::query()
                        ->orderBy('name')
                        ->whereHas(
                            'products',
                            fn (Builder $query) => $query->where('in_stock', true),
                        )
                        ->get(['id', 'name', 'slug'])
                        ->map(fn (Category $category) => [
                            'id' => $category->id,
                            'name' => $category->name,
                            'slug' => $category->slug,
                        ])
                        ->all()
                ),
            ],
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
