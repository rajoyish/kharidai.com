<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Keeps a unique `slug` column in sync with the model's `title`.
 *
 * The slug is regenerated whenever the title changes, unless the slug was
 * explicitly set on the model, which lets editors pin a permalink.
 */
trait HasUniqueSlug
{
    public static function bootHasUniqueSlug(): void
    {
        static::saving(function (Model $model): void {
            if (filled($model->getAttribute('slug')) && ! $model->isDirty('title')) {
                return;
            }

            if ($model->isDirty('slug') && filled($model->getAttribute('slug'))) {
                $model->setAttribute('slug', static::uniqueSlug(Str::slug((string) $model->getAttribute('slug')), $model));

                return;
            }

            $model->setAttribute('slug', static::uniqueSlug(Str::slug((string) $model->getAttribute('title')), $model));
        });
    }

    protected static function uniqueSlug(string $slug, Model $model): string
    {
        $originalSlug = $slug === '' ? 'untitled' : $slug;
        $slug = $originalSlug;
        $count = 1;

        while (static::query()->where('slug', $slug)->whereKeyNot($model->getKey())->exists()) {
            $slug = "{$originalSlug}-{$count}";
            $count++;
        }

        return $slug;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
