<?php

namespace App\Models;

use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

#[Fillable(['name', 'slug'])]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    public const STOREFRONT_NAVIGATION_CACHE_KEY = 'storefront:navigation:categories';

    protected static function booted(): void
    {
        static::saving(function (Category $category) {
            if (empty($category->slug) || $category->isDirty('name')) {
                $slug = Str::slug($category->name);
                $originalSlug = $slug;
                $count = 1;
                while (static::where('slug', $slug)->where('id', '!=', $category->id)->exists()) {
                    $slug = "{$originalSlug}-{$count}";
                    $count++;
                }
                $category->slug = $slug;
            }
        });

        static::saved(fn () => self::flushStorefrontNavigationCache());
        static::deleted(fn () => self::flushStorefrontNavigationCache());
    }

    public static function flushStorefrontNavigationCache(): void
    {
        Cache::forget(self::STOREFRONT_NAVIGATION_CACHE_KEY);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
