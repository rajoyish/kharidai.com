<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Shared helpers for building the server-rendered SEO payload.
 *
 * Social crawlers (WhatsApp, Facebook, Twitter) never execute JavaScript, so
 * every public controller must pass a complete `seo` prop for the Blade root
 * template to render into the initial HTML head.
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
