<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Product;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Shared helpers for building the server-rendered SEO payload.
 *
 * Social crawlers (WhatsApp, Facebook, Twitter) never execute JavaScript, so
 * every public controller must pass a complete `seo` prop for the Blade root
 * template to render into the initial HTML head. Structured data (`jsonLd`)
 * travels in the same payload for the same reason: schema built only in React
 * is invisible to any crawler that does not run scripts.
 */
trait BuildsSeoMetadata
{
    protected function pageTitle(string $title): string
    {
        return $title.' - '.config('app.name');
    }

    protected function seoDescription(?string $description, string $fallback): string
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
    protected function defaultSeoImage(): array
    {
        return $this->seoImage(
            asset('kharidai_og.png'),
            public_path('kharidai_og.png'),
        );
    }

    /**
     * SEO image details for a file on the public storage disk, falling back to
     * the site-wide default when no path is given.
     *
     * @return array{url: string, type: string|null, width: int|null, height: int|null}
     */
    protected function storageSeoImage(?string $imagePath): array
    {
        if (! filled($imagePath)) {
            return $this->defaultSeoImage();
        }

        $disk = Storage::disk('public');

        $url = $disk->url($imagePath);
        if (! str_starts_with($url, 'http')) {
            $url = asset($url);
        }

        // Only cache when the file is readable: uploads get unique hashed
        // paths, so a successful read never goes stale, but caching a miss
        // (e.g. before storage:link exists) would pin fallback dimensions
        // forever.
        if (! $disk->exists($imagePath)) {
            return $this->seoImage($url, null);
        }

        return Cache::rememberForever(
            'seo_image_'.md5($url),
            fn (): array => $this->seoImage($url, $disk->path($imagePath)),
        );
    }

    /**
     * The publisher/brand node reused by every other schema on the site.
     *
     * @return array<string, mixed>
     */
    protected function organizationSchema(): array
    {
        return [
            '@type' => 'Organization',
            '@id' => route('home').'#organization',
            'name' => config('app.name'),
            'url' => route('home'),
            'logo' => [
                '@type' => 'ImageObject',
                'url' => asset('kharidai_og.png'),
            ],
        ];
    }

    /**
     * Site-level schema for the home page, exposing the storefront search box
     * so Google can offer a sitelinks search field.
     *
     * @return array<string, mixed>
     */
    protected function websiteSchema(): array
    {
        return [
            '@type' => 'WebSite',
            '@id' => route('home').'#website',
            'name' => config('app.name'),
            'url' => route('home'),
            'publisher' => ['@id' => route('home').'#organization'],
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => [
                    '@type' => 'EntryPoint',
                    'urlTemplate' => route('home').'?search={search_term_string}',
                ],
                'query-input' => 'required name=search_term_string',
            ],
        ];
    }

    /**
     * @param  list<array{name: string, url: string}>  $trail
     * @return array<string, mixed>
     */
    protected function breadcrumbSchema(array $trail): array
    {
        return [
            '@type' => 'BreadcrumbList',
            'itemListElement' => collect($trail)
                ->values()
                ->map(fn (array $crumb, int $index): array => [
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => $crumb['name'],
                    'item' => $crumb['url'],
                ])
                ->all(),
        ];
    }

    /**
     * Product schema for the detail page.
     *
     * Offers are derived from whichever prices the visitor is actually allowed
     * to see: guests on digital products only ever get the aggregate "starting"
     * price, so the schema must never expose per-variant pricing they were
     * denied. Products with no visible price emit no `offers` at all rather
     * than a fabricated zero, which Google rejects as invalid.
     *
     * @return array<string, mixed>
     */
    protected function productSchema(Product $product, bool $canViewVariants, ?float $startingPrice, string $description): array
    {
        $schema = [
            '@type' => 'Product',
            'name' => $product->title,
            'description' => $description,
            'url' => route('products.show', $product),
            'sku' => (string) $product->slug,
            'image' => $this->productSchemaImages($product),
            'brand' => ['@id' => route('home').'#organization'],
        ];

        $offer = $this->productSchemaOffer($product, $canViewVariants, $startingPrice);

        if ($offer !== null) {
            $schema['offers'] = $offer;
        }

        return $schema;
    }

    /**
     * The main image followed by every gallery image, as absolute URLs.
     *
     * @return list<string>
     */
    private function productSchemaImages(Product $product): array
    {
        return array_values(
            collect([$product->image])
                ->concat($product->galleries->pluck('image_path'))
                ->filter(fn (?string $path): bool => filled($path))
                ->map(fn (string $path): string => $this->storageSeoImage($path)['url'])
                ->unique()
                ->all()
        );
    }

    /**
     * A single `Offer` when exactly one price is visible, an `AggregateOffer`
     * when the visitor can see a range, and `null` when no price is public.
     *
     * @return array<string, mixed>|null
     */
    private function productSchemaOffer(Product $product, bool $canViewVariants, ?float $startingPrice): ?array
    {
        $base = [
            'priceCurrency' => 'NPR',
            'availability' => $product->in_stock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            'itemCondition' => 'https://schema.org/NewCondition',
            'url' => route('products.show', $product),
            'seller' => ['@id' => route('home').'#organization'],
        ];

        if (! $canViewVariants) {
            // A `0.00` price is the storefront's "price on request" placeholder,
            // not a free product, so it must not become a schema offer.
            return $startingPrice > 0
                ? array_merge($base, ['@type' => 'AggregateOffer', 'lowPrice' => $startingPrice, 'offerCount' => 1])
                : null;
        }

        $prices = $product->variants
            ->filter(fn ($variant): bool => (bool) $variant->show_pricing && $variant->price_npr > 0)
            ->map(fn ($variant): float => (float) $variant->price_npr)
            ->values();

        if ($prices->isEmpty()) {
            return null;
        }

        if ($prices->count() === 1) {
            return array_merge($base, ['@type' => 'Offer', 'price' => $prices->first()]);
        }

        return array_merge($base, [
            '@type' => 'AggregateOffer',
            'lowPrice' => $prices->min(),
            'highPrice' => $prices->max(),
            'offerCount' => $prices->count(),
        ]);
    }

    /**
     * @return array{url: string, type: string|null, width: int|null, height: int|null}
     */
    protected function seoImage(string $url, ?string $absolutePath): array
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
}
