<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        $categories = $this->storefrontCategories();
        $uncategorizedProducts = $this->storefrontProductQuery(
            Product::query()->whereNull('category_id'),
        )->get();

        return Inertia::render('welcome', [
            'categories' => $categories,
            'uncategorizedProducts' => $uncategorizedProducts,
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

    public function category(Category $category): Response
    {
        $defaultSeoImage = $this->defaultSeoImage();

        $category->load([
            'products' => fn (HasMany $query): HasMany => $this->storefrontProductQuery($query),
        ]);

        $productCount = $category->products->count();

        return Inertia::render('Categories/Show', [
            'category' => $category,
            'categories' => $this->storefrontCategoryNavigation(),
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
        if (! $product->in_stock) {
            abort(404);
        }

        $product->load('variants');
        $productSeoImage = $this->productSeoImage($product);

        return Inertia::render('Products/Show', [
            'product' => $product,
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

        $summarySource = collect($paragraphMatches[1] ?? [])
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
        $pathWithoutQuery = strtok($url, '?');
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
            'type' => $details['mime'] ?? $fallbackType,
            'width' => $details[0] ?? 1200,
            'height' => $details[1] ?? 630,
        ];
    }

    /**
     * @return Collection<int, Category>
     */
    private function storefrontCategories(): Collection
    {
        return Category::query()
            ->orderBy('name')
            ->with([
                'products' => fn (HasMany $query): HasMany => $this->storefrontProductQuery($query),
            ])
            ->get()
            ->filter(fn (Category $category): bool => $category->products->isNotEmpty())
            ->values();
    }

    /**
     * @return Collection<int, array{id: int, name: string, slug: string, product_count: int}>
     */
    private function storefrontCategoryNavigation(): Collection
    {
        return Category::query()
            ->orderBy('name')
            ->whereHas('products', fn (Builder $query): Builder => $query->where('in_stock', true))
            ->withCount([
                'products as product_count' => fn (Builder $query): Builder => $query->where('in_stock', true),
            ])
            ->get(['id', 'name', 'slug'])
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'product_count' => $category->product_count,
            ]);
    }

    private function storefrontProductQuery(Builder|HasMany $query): Builder|HasMany
    {
        return $query
            ->where('in_stock', true)
            ->with('variants')
            ->latest();
    }
}
