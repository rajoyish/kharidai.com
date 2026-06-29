<?php

namespace App\Models;

use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug'])]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (Category $category) {
            if (empty($category->slug) || $category->isDirty('name')) {
                $slug = \Illuminate\Support\Str::slug($category->name);
                $originalSlug = $slug;
                $count = 1;
                while (static::where('slug', $slug)->where('id', '!=', $category->id)->exists()) {
                    $slug = "{$originalSlug}-{$count}";
                    $count++;
                }
                $category->slug = $slug;
            }
        });
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
