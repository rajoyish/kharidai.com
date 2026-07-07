<?php

namespace App\Models;

use Database\Factories\PhysicalProductDetailFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property float|null $weight_kg
 * @property float|null $flat_shipping_npr
 * @property bool $free_shipping
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Product $product
 */
#[Fillable(['product_id', 'weight_kg', 'flat_shipping_npr', 'free_shipping'])]
class PhysicalProductDetail extends Model
{
    /** @use HasFactory<PhysicalProductDetailFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weight_kg' => 'decimal:2',
            'free_shipping' => 'boolean',
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
     * @return Attribute<float|null, int|null>
     */
    protected function flatShippingNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value === null ? null : (float) $value / 100,
            set: fn ($value) => $value === null ? null : (int) round($value * 100),
        );
    }
}
