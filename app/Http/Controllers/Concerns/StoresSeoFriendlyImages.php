<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores uploaded images under descriptive, slugified names.
 *
 * Laravel's default `store()` names files after a random 40-char hash, which
 * tells crawlers nothing. Image search ranks partly on the filename, so we
 * derive it from the uploaded name (and, where available, the owning model's
 * title) and append a unique suffix so no upload can clobber another.
 */
trait StoresSeoFriendlyImages
{
    /**
     * Longest slug we keep before the uniqueness suffix. Leaves comfortable
     * room under the common 255-byte filename limit for the suffix, extension,
     * and any path prefix the disk driver adds.
     */
    protected const SEO_IMAGE_SLUG_LIMIT = 80;

    /**
     * @param  string|null  $prefix  a model title/slug to lead the filename with
     * @return string|false the stored path, or false when the disk write fails
     */
    protected function storeImageWithSeoName(UploadedFile $file, string $directory, ?string $prefix = null, string $disk = 'public'): string|false
    {
        $name = $this->seoFriendlyImageName($file, $directory, $prefix, $disk);

        return $file->storeAs($directory, $name, $disk);
    }

    /**
     * Builds `[prefix-]original-name-<unique>.ext`, retrying the suffix until
     * the name is free so an upload never silently overwrites an existing file.
     */
    protected function seoFriendlyImageName(UploadedFile $file, string $directory, ?string $prefix = null, string $disk = 'public'): string
    {
        $base = collect([$prefix, pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)])
            ->map(fn (?string $part): string => Str::slug((string) $part))
            ->filter()
            ->implode('-');

        $base = trim(Str::limit($base, self::SEO_IMAGE_SLUG_LIMIT, ''), '-') ?: 'image';

        $extension = $this->imageExtension($file);

        do {
            $name = $base.'-'.uniqid().'.'.$extension;
        } while (Storage::disk($disk)->exists($directory.'/'.$name));

        return $name;
    }

    /**
     * Prefers the extension guessed from the file's MIME type, since the
     * client-supplied one is attacker-controlled and may be missing entirely.
     */
    protected function imageExtension(UploadedFile $file): string
    {
        $extension = $file->extension() ?: $file->getClientOriginalExtension();

        $extension = Str::lower(preg_replace('/[^A-Za-z0-9]/', '', $extension) ?? '');

        return $extension !== '' ? $extension : 'jpg';
    }
}
