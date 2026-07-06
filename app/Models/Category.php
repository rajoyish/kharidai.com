<?php

namespace App\Models;

use App\Enums\ProductType;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int|null $parent_id
 * @property string $name
 * @property string $slug
 * @property ProductType|null $type
 * @property int $sort_order
 * @property Category|null $parent
 * @property int|null $product_variants_count
 */
#[Fillable(['parent_id', 'name', 'slug', 'type', 'sort_order'])]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    public const STOREFRONT_NAVIGATION_CACHE_KEY = 'storefront:navigation:groups';

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

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ProductType::class,
            'sort_order' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * @return HasMany<Category, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order');
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }

    /**
     * Eager-load the total number of product variants belonging to products
     * directly assigned to this category, as a `product_variants_count`
     * attribute. Resolved with a single correlated subquery to avoid N+1.
     *
     * @param  Builder<Category>  $query
     */
    public function scopeWithProductVariantsCount(Builder $query): void
    {
        $query->addSelect(['product_variants_count' => ProductVariant::query()
            ->selectRaw('count(*)')
            ->join('category_product', 'category_product.product_id', '=', 'product_variants.product_id')
            ->whereColumn('category_product.category_id', 'categories.id'),
        ]);
    }

    /**
     * The IDs of this category and every category above it in the tree.
     * Used to prevent assigning a parent that would create a cycle.
     *
     * @return list<int>
     */
    public function ancestorIds(): array
    {
        $ids = [];
        $current = $this->parent;

        while ($current !== null && ! in_array($current->id, $ids, true)) {
            $ids[] = $current->id;
            $current = $current->parent;
        }

        return $ids;
    }

    /**
     * Whether assigning the given parent would introduce a cycle
     * (i.e. the parent is this category or one of its descendants).
     */
    public function wouldCreateCycleWith(Category $parent): bool
    {
        if ($parent->id === $this->id) {
            return true;
        }

        return in_array($this->id, $parent->ancestorIds(), true);
    }
}
