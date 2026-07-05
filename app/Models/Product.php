<?php

namespace App\Models;

use App\Enums\ProductType;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property ProductType $type
 * @property string $title
 * @property string|null $description
 * @property string|null $image
 * @property bool $in_stock
 * @property bool $is_visible
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property int|null $category_id
 * @property string|null $slug
 * @property Category|null $category
 */
#[Fillable(['type', 'title', 'slug', 'description', 'image', 'in_stock', 'is_visible', 'category_id'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (Product $product) {
            if (empty($product->slug) || $product->isDirty('title')) {
                $slug = Str::slug($product->title);
                $originalSlug = $slug;
                $count = 1;
                while (static::where('slug', $slug)->where('id', '!=', $product->id)->exists()) {
                    $slug = "{$originalSlug}-{$count}";
                    $count++;
                }
                $product->slug = $slug;
            }
        });

        static::saved(fn () => Category::flushStorefrontNavigationCache());
        static::deleted(fn () => Category::flushStorefrontNavigationCache());
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected function casts(): array
    {
        return [
            'type' => ProductType::class,
            'in_stock' => 'boolean',
            'is_visible' => 'boolean',
        ];
    }

    /**
     * Only products that should appear on the public storefront.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('is_visible', true);
    }

    /**
     * Constrain the query to a single product type.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeOfType(Builder $query, ProductType $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * @return HasMany<Gallery, $this>
     */
    public function galleries(): HasMany
    {
        return $this->hasMany(Gallery::class)->orderBy('sort_order');
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

    /**
     * @return HasOne<PhysicalProductDetail, $this>
     */
    public function physicalDetail(): HasOne
    {
        return $this->hasOne(PhysicalProductDetail::class);
    }

    /**
     * @return HasOne<ServiceDetail, $this>
     */
    public function serviceDetail(): HasOne
    {
        return $this->hasOne(ServiceDetail::class);
    }

    /**
     * @return HasMany<ServiceEngagement, $this>
     */
    public function serviceEngagements(): HasMany
    {
        return $this->hasMany(ServiceEngagement::class);
    }

    /**
     * Guarantee the product has at least one orderable variant. A service is
     * priced only after the work is scoped (measurement → negotiation), so it
     * has no natural package; without a variant it cannot enter the cart, which
     * is keyed on a product variant. This provisions a zero-priced "Standard"
     * unit — a price-on-request placeholder mirroring the admin assign flow —
     * so the service can be ordered and its engagement negotiated later.
     */
    public function ensureOrderableVariant(): void
    {
        if ($this->variants()->exists()) {
            return;
        }

        $this->variants()->create([
            'name' => 'Standard',
            'price_npr' => 0,
            'purchase_price_npr' => 0,
        ]);
    }
}
