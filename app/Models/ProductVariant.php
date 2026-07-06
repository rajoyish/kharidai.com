<?php

namespace App\Models;

use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property string $name
 * @property string|null $details
 * @property float $price_npr
 * @property float $purchase_price_npr
 * @property int|null $validity_days
 * @property list<string>|null $colors
 * @property list<string>|null $sizes
 * @property int|null $weight_grams
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Product $product
 */
#[Fillable(['product_id', 'name', 'details', 'price_npr', 'purchase_price_npr', 'validity_days', 'colors', 'sizes', 'weight_grams'])]
class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'validity_days' => 'integer',
            'colors' => 'array',
            'sizes' => 'array',
            'weight_grams' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function priceNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value / 100,
            set: fn ($value) => $value * 100,
        );
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function purchasePriceNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value / 100,
            set: fn ($value) => $value * 100,
        );
    }
}
