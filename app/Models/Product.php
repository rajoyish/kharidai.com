<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property string|null $image
 * @property bool $in_stock
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property int|null $category_id
 * @property string|null $slug
 * @property Category|null $category
 */
#[Fillable(['title', 'slug', 'description', 'image', 'in_stock', 'category_id'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (Product $product) {
            if (empty($product->slug) || $product->isDirty('title')) {
                $slug = \Illuminate\Support\Str::slug($product->title);
                $originalSlug = $slug;
                $count = 1;
                while (static::where('slug', $slug)->where('id', '!=', $product->id)->exists()) {
                    $slug = "{$originalSlug}-{$count}";
                    $count++;
                }
                $product->slug = $slug;
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected function casts(): array
    {
        return [
            'in_stock' => 'boolean',
        ];
    }

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
