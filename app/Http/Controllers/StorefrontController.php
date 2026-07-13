<?php

namespace App\Http\Controllers;

use App\Enums\ProductType;
use App\Http\Controllers\Concerns\BuildsSeoMetadata;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    use BuildsSeoMetadata;

    public function index(): Response
    {
        $defaultSeoImage = $this->defaultSeoImage();
        $search = request()->string('search')->trim()->value() ?: null;

        $sections = collect(ProductType::cases())
            ->map(fn (ProductType $type): array => [
                'type' => $type->value,
                'label' => $type->pluralLabel(),
                'tagline' => $type->tagline(),
                'categories' => $this->storefrontCategories($type, $search),
                'uncategorizedProducts' => $this->uncategorizedProducts($type, $search),
            ])
            ->all();

        return Inertia::render('welcome', [
            'sections' => $sections,
            'filters' => ['search' => $search],
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle('Your all-in-one marketplace!'),
                'description' => 'Shop digital goods, subscriptions, services, and physical products from Kharidai.',
                'image' => $defaultSeoImage['url'],
                'imageAlt' => config('app.name').' marketplace preview',
                'imageType' => $defaultSeoImage['type'],
                'imageWidth' => $defaultSeoImage['width'],
                'imageHeight' => $defaultSeoImage['height'],
                'url' => route('home'),
                'type' => 'website',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'jsonLd' => [
                    $this->organizationSchema(),
                    $this->websiteSchema(),
                ],
            ],
        ]);
    }

    public function digitalProducts(): Response
    {
        return $this->renderTypePage(ProductType::Digital, 'digital-products.index', 'Storefront/DigitalProducts');
    }

    public function physicalProducts(): Response
    {
        return $this->renderTypePage(ProductType::Physical, 'physical-products.index', 'Storefront/PhysicalProducts');
    }

    public function services(): Response
    {
        return $this->renderTypePage(ProductType::Service, 'services.index', 'Storefront/Services');
    }

    /**
     * Render a dedicated storefront page scoped exclusively to a single product type.
     */
    private function renderTypePage(ProductType $type, string $routeName, string $component): Response
    {
        $defaultSeoImage = $this->defaultSeoImage();
        $search = request()->string('search')->trim()->value() ?: null;

        return Inertia::render($component, [
            'type' => $type->value,
            'label' => $type->pluralLabel(),
            'tagline' => $type->tagline(),
            'categories' => $this->storefrontCategories($type, $search),
            'uncategorizedProducts' => $this->uncategorizedProducts($type, $search),
            'filters' => ['search' => $search],
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($type->pluralLabel()),
                'description' => $type->tagline(),
                'image' => $defaultSeoImage['url'],
                'imageAlt' => $type->pluralLabel().' on '.config('app.name'),
                'imageType' => $defaultSeoImage['type'],
                'imageWidth' => $defaultSeoImage['width'],
                'imageHeight' => $defaultSeoImage['height'],
                'url' => route($routeName),
                'type' => 'website',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'jsonLd' => [
                    $this->organizationSchema(),
                    $this->breadcrumbSchema([
                        ['name' => 'Home', 'url' => route('home')],
                        ['name' => $type->pluralLabel(), 'url' => route($routeName)],
                    ]),
                ],
            ],
        ]);
    }

    public function category(Category $category): Response
    {
        $defaultSeoImage = $this->defaultSeoImage();

        $products = $this->storefrontProductQuery($category->products(), $category->type)->paginate(12)->withQueryString();
        $productCount = $products->total();

        return Inertia::render('Categories/Show', [
            'category' => $category,
            'products' => $products,
            'categories' => $this->storefrontCategoryNavigation($category->type),
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($category->name),
                'description' => $productCount > 0
                    ? "Browse {$productCount} ".Str::plural('product', $productCount)." in the {$category->name} category on Kharidai."
                    : "Browse the {$category->name} category on Kharidai.",
                'image' => $defaultSeoImage['url'],
                'imageAlt' => "{$category->name} category preview",
                'imageType' => $defaultSeoImage['type'],
                'imageWidth' => $defaultSeoImage['width'],
                'imageHeight' => $defaultSeoImage['height'],
                'url' => route('categories.show', $category),
                'type' => 'website',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'jsonLd' => [
                    $this->organizationSchema(),
                    $this->breadcrumbSchema($this->categoryTrail($category)),
                ],
            ],
        ]);
    }

    /**
     * Breadcrumb trail for a category: Home, its product-type listing page, the
     * parent category when the category is nested, then the category itself.
     *
     * @return list<array{name: string, url: string}>
     */
    private function categoryTrail(Category $category): array
    {
        $trail = [['name' => 'Home', 'url' => route('home')]];

        if ($category->type instanceof ProductType) {
            $trail[] = [
                'name' => $category->type->pluralLabel(),
                'url' => route($this->typeRouteName($category->type)),
            ];
        }

        $parent = $category->parent;

        if ($parent instanceof Category) {
            $trail[] = ['name' => $parent->name, 'url' => route('categories.show', $parent)];
        }

        $trail[] = ['name' => $category->name, 'url' => route('categories.show', $category)];

        return $trail;
    }

    private function typeRouteName(ProductType $type): string
    {
        return match ($type) {
            ProductType::Digital => 'digital-products.index',
            ProductType::Physical => 'physical-products.index',
            ProductType::Service => 'services.index',
        };
    }

    public function show(Product $product): Response
    {
        if (! $product->in_stock || ! $product->is_visible) {
            abort(404);
        }

        // Digital variant details stay behind authentication; physical and
        // service variants are public. Guests viewing a digital product never
        // receive the individual variant rows — only an aggregate "starting"
        // price computed in the database — so protected pricing never reaches
        // the browser.
        $canViewVariants = $product->type !== ProductType::Digital || auth()->check();

        $relations = ['galleries', 'categories'];
        if ($canViewVariants) {
            $relations[] = 'variants';
        }
        if ($product->type === ProductType::Physical) {
            $relations[] = 'physicalDetail';
        } elseif ($product->type === ProductType::Service) {
            $relations[] = 'serviceDetail';
        }

        $product->load($relations);

        // A variant with `show_pricing` off is quoted on request: the storefront
        // renders no price for it, but the row still travels to the browser for
        // its name and options. Withhold the amount at serialization rather than
        // relying on the UI to not render it, since anything in the payload is
        // readable straight from the HTML source.
        if ($canViewVariants) {
            $product->variants
                ->reject(fn (ProductVariant $variant): bool => (bool) $variant->show_pricing)
                ->each(fn (ProductVariant $variant) => $variant->makeHidden('price_npr'));
        }

        // Read the price off the cheapest priced variant as a model attribute so
        // the paisa-to-NPR conversion goes through the MoneyNpr cast rather than
        // a manual divide on the raw aggregate.
        $startingPrice = $canViewVariants
            ? null
            : $product->variants()
                ->where('show_pricing', true)
                ->orderBy('price_npr')
                ->first()?->price_npr;

        $productSeoImage = $this->storageSeoImage($product->image);
        $description = $product->seo_description ?? $this->seoDescription($product->description, $product->title);

        return Inertia::render('Products/Show', [
            'product' => $product,
            'canViewVariants' => $canViewVariants,
            'startingPrice' => $startingPrice,
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($product->seo_title ?? $product->title),
                'description' => $description,
                'image' => $productSeoImage['url'],
                'imageAlt' => $product->image_alt ?? $product->title,
                'imageType' => $productSeoImage['type'],
                'imageWidth' => $productSeoImage['width'],
                'imageHeight' => $productSeoImage['height'],
                'url' => route('products.show', $product),
                'type' => 'product',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'updatedTime' => $product->updated_at?->toAtomString(),
                'jsonLd' => [
                    $this->organizationSchema(),
                    $this->productSchema($product, $canViewVariants, $startingPrice, $description),
                    $this->breadcrumbSchema($this->productTrail($product)),
                ],
            ],
        ]);
    }

    /**
     * Breadcrumb trail for a product: Home, its type listing page, its first
     * category when it has one, then the product itself.
     *
     * @return list<array{name: string, url: string}>
     */
    private function productTrail(Product $product): array
    {
        $trail = [
            ['name' => 'Home', 'url' => route('home')],
            ['name' => $product->type->pluralLabel(), 'url' => route($this->typeRouteName($product->type))],
        ];

        $category = $product->categories->first();

        if ($category instanceof Category) {
            $trail[] = ['name' => $category->name, 'url' => route('categories.show', $category)];
        }

        $trail[] = ['name' => $product->title, 'url' => route('products.show', $product)];

        return $trail;
    }

    /**
     * Top-level storefront categories, optionally scoped to a single product type.
     * When a type is given, categories, their subcategories, and their products
     * are all filtered to that type so nothing from another type leaks through.
     *
     * @return Collection<int, Category>
     */
    private function storefrontCategories(?ProductType $type = null, ?string $search = null): Collection
    {
        return Category::query()
            ->whereNull('parent_id') // only top-level
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->with([
                'children' => function (Relation $query) use ($type): Relation {
                    $query
                        ->when($type, fn ($q) => $q->where('type', $type))
                        ->orderBy('sort_order')
                        ->orderBy('name');

                    return $query;
                },
                'products' => fn (Relation $query): Relation => $this->storefrontProductQuery($query, $type, $search),
                'children.products' => fn (Relation $query): Relation => $this->storefrontProductQuery($query, $type, $search),
            ])
            ->when($search, function (Builder $query) use ($search) {
                $query->where(function (Builder $q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereHas('products', fn (Builder $inner) => $this->searchProductQuery($inner, $search))
                        ->orWhereHas('children', function (Builder $inner) use ($search) {
                            $inner->where('name', 'like', "%{$search}%")
                                ->orWhereHas('products', fn (Builder $q) => $this->searchProductQuery($q, $search));
                        });
                });
            })
            ->get()
            ->filter(function (Category $category) use ($search) {
                if ($search && stripos($category->name, $search) !== false) {
                    return true;
                }

                return $category->products->isNotEmpty() || $category->children->contains(fn ($child) => $child->products->isNotEmpty());
            })
            ->values();
    }

    /**
     * Products with no category, scoped to a single product type, that should
     * still surface on the storefront.
     *
     * @return Collection<int, Product>
     */
    private function uncategorizedProducts(ProductType $type, ?string $search = null): Collection
    {
        return Product::query()
            ->whereDoesntHave('categories')
            ->ofType($type)
            ->visible()
            ->where('in_stock', true)
            ->withCount('variants')
            ->withMin(['variants as starting_price_cents' => fn (Builder $query): Builder => $query->where('show_pricing', true)], 'price_npr')
            ->when($search, fn (Builder $query) => $this->searchProductQuery($query, $search))
            ->latest()
            ->get();
    }

    /**
     * Constrain a product query to those matching a free-text search term.
     *
     * Generic over the builder's model because this also runs inside
     * `whereHas('products', ...)` closures, where the related builder is only
     * statically known as a bare Eloquent builder.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function searchProductQuery(Builder $query, string $search): Builder
    {
        return $query->where(function (Builder $inner) use ($search): void {
            $inner->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        });
    }

    /**
     * @return Collection<int, array{id: int, name: string, slug: string, product_count: int, children: array<int, array{id: int, name: string, slug: string, product_count: int}>}>
     */
    private function storefrontCategoryNavigation(?ProductType $type = null): Collection
    {
        return Category::query()
            ->whereNull('parent_id')
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->where(function (Builder $query) {
                $query->whereHas('products', fn (Builder $q) => $q->where('in_stock', true)->where('is_visible', true))
                    ->orWhereHas('children.products', fn (Builder $q) => $q->where('in_stock', true)->where('is_visible', true));
            })
            ->with([
                'children' => function ($q) use ($type) {
                    $q->when($type, fn ($inner) => $inner->where('type', $type))
                        ->orderBy('sort_order')
                        ->orderBy('name')
                        ->whereHas('products', fn (Builder $q) => $q->where('in_stock', true)->where('is_visible', true))
                        ->withCount(['products as product_count' => fn (Builder $q) => $q->where('in_stock', true)->where('is_visible', true)]);
                },
            ])
            ->withCount([
                'products as product_count' => fn (Builder $query): Builder => $query->where('in_stock', true)->where('is_visible', true),
            ])
            ->get(['id', 'name', 'slug', 'parent_id', 'sort_order'])
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'product_count' => (int) $category->getAttribute('product_count'),
                'children' => $category->children->map(fn (Category $child): array => [
                    'id' => $child->id,
                    'name' => $child->name,
                    'slug' => $child->slug,
                    'product_count' => (int) $child->getAttribute('product_count'),
                ])->all(),
            ]);
    }

    /**
     * @param  Relation<Product, Category, *>  $query
     * @return Relation<Product, Category, *>
     */
    private function storefrontProductQuery(Relation $query, ?ProductType $type = null, ?string $search = null): Relation
    {
        $query
            ->when($type, fn ($inner) => $inner->where('type', $type))
            ->where('in_stock', true)
            ->where('is_visible', true)
            ->when($search, fn ($inner) => $this->searchProductQuery($inner, $search))
            ->withCount('variants')
            ->withMin(['variants as starting_price_cents' => fn (Builder $query): Builder => $query->where('show_pricing', true)], 'price_npr')
            ->latest();

        return $query;
    }
}
