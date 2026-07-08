<?php

namespace App\Http\Middleware;

use App\Enums\ProductType;
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

        $cart = $request->user()
            ? Cart::where('user_id', $request->user()->id)->withSum('items', 'quantity')->first()
            : null;

        $shared = [
            ...parent::share($request),
            'name' => $siteName,
            'auth' => [
                'user' => $request->user() ? $request->user()->only('id', 'name', 'email', 'avatar', 'is_admin') : null,
            ],
            'cartCount' => (int) ($cart?->getAttribute('items_sum_quantity') ?? 0),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'seo' => [
                'name' => $siteName,
                'title' => $siteName,
                'description' => 'Shop digital goods, premium subscriptions, professional services, and physical products from Kharidai, Nepal\'s premier digital and physical marketplace.',
                'image' => asset('kharidai_og.png'),
                'imageAlt' => $siteName.' marketplace preview',
                'url' => $request->url(),
                'type' => 'website',
                'robots' => $request->routeIs('home', 'products.show') ? 'index,follow' : 'noindex,nofollow',
                'twitterCard' => 'summary_large_image',
            ],
        ];

        // Storefront navigation is only consumed by the public storefront layout,
        // so it is shared exclusively on those routes.
        if ($request->routeIs('home', 'categories.show', 'products.show', 'digital-products.index', 'physical-products.index', 'services.index')) {
            $shared['storefront'] = fn (): array => [
                'groups' => $this->storefrontNavigation(),
            ];
        }

        return $shared;
    }

    /**
     * Storefront navigation grouped by product type — "Digital Products",
     * "Physical Products" and "Services" — each holding that type's category
     * tree. Cached forever and transparently rebuilt whenever the cached payload
     * is missing or corrupt. Branches with no visible, in-stock products at any
     * depth are pruned; any categories without a recognised type fall under
     * "More" so nothing silently disappears from the menu.
     *
     * Each element has the shape `array{type: string, label: string, categories:
     * list<array{id: int, name: string, slug: string, children?: array<int, mixed>}>}`.
     * The type is widened to `list<mixed>` because the cached branch returns an
     * unvalidated payload; the strict shape is enforced by the frontend types.
     *
     * @return list<mixed>
     */
    private function storefrontNavigation(): array
    {
        $cached = Cache::get(Category::STOREFRONT_NAVIGATION_CACHE_KEY);

        if (is_array($cached) && array_is_list($cached)) {
            return $cached;
        }

        $all = Category::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parent_id', 'type']);

        $visibleIds = Category::query()
            ->whereHas(
                'products',
                fn (Builder $query) => $query->where('in_stock', true)->where('is_visible', true),
            )
            ->pluck('id')
            ->flip();

        $childrenByParent = $all->groupBy('parent_id');

        $build = function (Category $category) use (&$build, $childrenByParent, $visibleIds): ?array {
            $children = $childrenByParent->get($category->id, collect())
                ->map(fn (Category $child): ?array => $build($child))
                ->filter()
                ->values();

            if (! $visibleIds->has($category->id) && $children->isEmpty()) {
                return null;
            }

            $node = [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ];

            if ($children->isNotEmpty()) {
                $node['children'] = $children->all();
            }

            return $node;
        };

        $topLevel = $all->whereNull('parent_id');

        $labels = [
            ProductType::Digital->value => ProductType::Digital->pluralLabel(),
            ProductType::Physical->value => ProductType::Physical->pluralLabel(),
            ProductType::Service->value => ProductType::Service->pluralLabel(),
        ];

        $groupFor = fn (callable $filter): array => $topLevel
            ->filter($filter)
            ->map(fn (Category $category): ?array => $build($category))
            ->filter()
            ->values()
            ->all();

        $groups = [];

        foreach ($labels as $typeValue => $label) {
            $categories = $groupFor(fn (Category $category): bool => $category->type?->value === $typeValue);

            if (! empty($categories)) {
                $groups[] = ['type' => $typeValue, 'label' => $label, 'categories' => $categories];
            }
        }

        $others = $groupFor(fn (Category $category): bool => ! array_key_exists((string) $category->type?->value, $labels));

        if (! empty($others)) {
            $groups[] = ['type' => 'more', 'label' => 'More', 'categories' => $others];
        }

        Cache::forever(Category::STOREFRONT_NAVIGATION_CACHE_KEY, $groups);

        return $groups;
    }
}
