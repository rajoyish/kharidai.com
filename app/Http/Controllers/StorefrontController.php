<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    public function index(): Response
    {
        $defaultSeoImage = $this->defaultSeoImage();

        $categoriesQuery = Category::orderBy('name');
        $uncategorizedQuery = Product::whereNull('category_id')->where('in_stock', true)->with('variants');

        $categoriesQuery->with(['products' => function ($q): void {
            $q->where('in_stock', true)->with('variants');
        }]);

        $categories = $categoriesQuery->get();
        // Only keep categories that have products
        $categories = $categories->filter(function ($category) {
            return $category->products->count() > 0;
        })->values();

        $uncategorizedProducts = $uncategorizedQuery->latest()->get();

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
            $this->versionedUrl(
                asset('kharidai_og.png'),
                is_file($defaultImagePath) ? filemtime($defaultImagePath) : null,
            ),
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
            $this->versionedUrl(
                $url,
                $product->updated_at?->timestamp,
            ),
            $absoluteImagePath,
        );
    }

    private function versionedUrl(string $url, int|false|null $version): string
    {
        if (! $version) {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'v='.$version;
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
}
