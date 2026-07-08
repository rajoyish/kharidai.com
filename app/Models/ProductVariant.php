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
 * @property bool $show_pricing
 * @property int|null $validity_days
 * @property list<string>|null $colors
 * @property list<string>|null $sizes
 * @property float|null $weight_kg
 * @property bool $ships_individually
 * @property int|null $advance_payment_percent
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Product $product
 */
#[Fillable(['product_id', 'name', 'details', 'price_npr', 'purchase_price_npr', 'show_pricing', 'validity_days', 'colors', 'sizes', 'weight_kg', 'ships_individually', 'advance_payment_percent'])]
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
            'show_pricing' => 'boolean',
            'colors' => 'array',
            'sizes' => 'array',
            'weight_kg' => 'decimal:2',
            'ships_individually' => 'boolean',
            'advance_payment_percent' => 'integer',
        ];
    }

    /**
     * The advance payment owed up front for one unit of this variant, in NPR,
     * derived from its configured advance percentage of the selling price.
     */
    public function advancePaymentNpr(): float
    {
        if (! $this->advance_payment_percent) {
            return 0.0;
        }

        return round($this->price_npr * $this->advance_payment_percent / 100, 2);
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
