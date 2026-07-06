<?php

namespace App\Http\Controllers;

use App\Enums\ProductType;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    public function index(): Response
    {
        $defaultSeoImage = $this->defaultSeoImage();
        $search = request('search');

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
        $search = request('search');

        return Inertia::render($component, [
            'type' => $type->value,
            'label' => $type->pluralLabel(),
            'tagline' => $type->tagline(),
            'categories' => $this->storefrontCategories($type, $search),
            'uncategorizedProducts' => $this->uncategorizedProducts($type, $search),
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
            ],
        ]);
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

        $relations = ['galleries'];
        if ($canViewVariants) {
            $relations[] = 'variants';
        }
        if ($product->type === ProductType::Physical) {
            $relations[] = 'physicalDetail';
        } elseif ($product->type === ProductType::Service) {
            $relations[] = 'serviceDetail';
        }

        $product->load($relations);

        $startingPriceInCents = $canViewVariants
            ? null
            : $product->variants()->min('price_npr');

        $productSeoImage = $this->productSeoImage($product);

        return Inertia::render('Products/Show', [
            'product' => $product,
            'canViewVariants' => $canViewVariants,
            'startingPrice' => $startingPriceInCents !== null ? $startingPriceInCents / 100 : null,
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($product->title),
                'description' => $this->seoDescription($product->description, $product->title),
                'image' => $productSeoImage['url'],
                'imageAlt' => $product->title,
                'imageType' => $productSeoImage['type'],
                'imageWidth' => $productSeoImage['width'],
                'imageHeight' => $productSeoImage['height'],
                'url' => route('products.show', $product),
                'type' => 'product',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'updatedTime' => $product->updated_at?->toAtomString(),
            ],
        ]);
    }

    private function pageTitle(string $title): string
    {
        return $title.' - '.config('app.name');
    }

    private function seoDescription(?string $description, string $fallback): string
    {
        $descriptionHtml = (string) $description;
        preg_match_all('/<p\b[^>]*>(.*?)<\/p>/is', $descriptionHtml, $paragraphMatches);

        $summarySource = collect($paragraphMatches[1])
            ->map(fn (string $paragraph): string => $this->htmlToPlainText($paragraph))
            ->first(fn (string $paragraph): bool => filled($paragraph));

        $summary = Str::of($summarySource ?? $this->htmlToPlainText($descriptionHtml))
            ->squish()
            ->limit(160)
            ->value();

        return filled($summary) ? $summary : $fallback;
    }

    private function htmlToPlainText(string $html): string
    {
        $normalizedHtml = preg_replace(
            '/<(\/?(br|div|h[1-6]|li|ol|p|section|article|blockquote|ul))[^>]*>/i',
            ' ',
            $html,
        );

        return html_entity_decode(
            strip_tags($normalizedHtml ?? $html),
            ENT_QUOTES | ENT_HTML5,
            'UTF-8',
        );
    }

    /**
     * @return array{url: string, type: string|null, width: int|null, height: int|null}
     */
    private function defaultSeoImage(): array
    {
        $defaultImagePath = public_path('kharidai_og.png');

        return $this->seoImage(
            asset('kharidai_og.png'),
            $defaultImagePath,
        );
    }

    /**
     * @return array{url: string, type: string|null, width: int|null, height: int|null}
     */
    private function productSeoImage(Product $product): array
    {
        if (! filled($product->image)) {
            return $this->defaultSeoImage();
        }

        $disk = Storage::disk('public');
        $imagePath = $product->image;

        $url = $disk->url($imagePath);
        if (! str_starts_with($url, 'http')) {
            $url = asset($url);
        }

        $absoluteImagePath = $disk->exists($imagePath) ? $disk->path($imagePath) : null;

        return $this->seoImage(
            $url,
            $absoluteImagePath,
        );
    }

    /**
     * @return array{url: string, type: string|null, width: int|null, height: int|null}
     */
    private function seoImage(string $url, ?string $absolutePath): array
    {
        // Extract extension from URL without query parameters
        $pathWithoutQuery = Str::before($url, '?');
        $extension = strtolower(pathinfo($pathWithoutQuery, PATHINFO_EXTENSION));
        $fallbackType = $extension === 'jpg' ? 'image/jpeg' : ($extension ? 'image/'.$extension : null);

        $image = [
            'url' => $url,
            'type' => $fallbackType,
            'width' => 1200, // Fallback width for social shares
            'height' => 630, // Fallback height
        ];

        if (! filled($absolutePath) || ! is_file($absolutePath)) {
            return $image;
        }

        $details = @getimagesize($absolutePath);

        if ($details === false) {
            return $image;
        }

        return [
            'url' => $url,
            'type' => $details['mime'],
            'width' => $details[0],
            'height' => $details[1],
        ];
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
                'products' => fn (Relation $query): Relation => $this->storefrontProductQuery($query, $type),
                'children.products' => fn (Relation $query): Relation => $this->storefrontProductQuery($query, $type),
            ])
            ->when($search, function (Builder $query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereHas('products', function (Builder $q) use ($search) {
                            $q->where('title', 'like', "%{$search}%")
                                ->orWhere('description', 'like', "%{$search}%");
                        })
                        ->orWhereHas('children', function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhereHas('products', function (Builder $q) use ($search) {
                                    $q->where('title', 'like', "%{$search}%")
                                        ->orWhere('description', 'like', "%{$search}%");
                                });
                        });
                });
            })
            ->get()
            ->map(function (Category $category) use ($search) {
                if ($search) {
                    $category->setRelation('products', $category->products->filter(function ($product) use ($search) {
                        return stripos($product->title, $search) !== false ||
                               stripos((string) $product->description, $search) !== false;
                    })->values());

                    $category->children->each(function ($child) use ($search) {
                        $child->setRelation('products', $child->products->filter(function ($product) use ($search) {
                            return stripos($product->title, $search) !== false ||
                                   stripos((string) $product->description, $search) !== false;
                        })->values());
                    });
                }

                return $category;
            })
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
            ->withMin('variants as starting_price_cents', 'price_npr')
            ->when($search, fn ($query) => $query->where(function (Builder $inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            }))
            ->latest()
            ->get();
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
    private function storefrontProductQuery(Relation $query, ?ProductType $type = null): Relation
    {
        $query
            ->when($type, fn ($inner) => $inner->where('type', $type))
            ->where('in_stock', true)
            ->where('is_visible', true)
            ->withCount('variants')
            ->withMin('variants as starting_price_cents', 'price_npr')
            ->latest();

        return $query;
    }
}
