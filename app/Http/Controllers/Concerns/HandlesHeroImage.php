<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Dimensions;

/**
 * Shared hero image handling for CMS content.
 *
 * Hero images double as Open Graph images, so they are pinned to the exact
 * 1200x630 ratio that social crawlers expect rather than merely constrained.
 */
trait HandlesHeroImage
{
    public const HERO_IMAGE_WIDTH = 1200;

    public const HERO_IMAGE_HEIGHT = 630;

    protected function heroImageDimensions(): Dimensions
    {
        return Rule::dimensions()
            ->width(self::HERO_IMAGE_WIDTH)
            ->height(self::HERO_IMAGE_HEIGHT);
    }

    /** @return array<string, mixed> */
    protected function heroImageRules(): array
    {
        return [
            'image' => ['nullable', 'image', 'max:10240', $this->heroImageDimensions()],
            'image_alt' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    protected function heroImageValidationMessages(): array
    {
        return [
            'image.dimensions' => 'The image must be exactly '.self::HERO_IMAGE_WIDTH.'x'.self::HERO_IMAGE_HEIGHT.' pixels.',
        ];
    }

    /**
     * Stores a newly uploaded hero image and removes the one it replaces.
     */
    protected function storeHeroImage(Request $request, string $directory, ?string $currentPath = null): ?string
    {
        if (! $request->hasFile('image')) {
            return $currentPath;
        }

        $path = $request->file('image')->store($directory, 'public');

        if ($path === false) {
            abort(500, 'Failed to store the uploaded image.');
        }

        if ($currentPath) {
            Storage::disk('public')->delete($currentPath);
        }

        return $path;
    }
}
