<?php

namespace App\Models;

use Database\Factories\ShippingRateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $shipping_zone_id
 * @property float $base_fee_npr
 * @property float $per_kg_fee_npr
 * @property float|null $parcel_capacity_kg
 * @property float|null $free_over_npr
 * @property int|null $min_days
 * @property int|null $max_days
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property ShippingZone $zone
 */
#[Fillable(['shipping_zone_id', 'base_fee_npr', 'per_kg_fee_npr', 'parcel_capacity_kg', 'free_over_npr', 'min_days', 'max_days'])]
class ShippingRate extends Model
{
    /** @use HasFactory<ShippingRateFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'parcel_capacity_kg' => 'decimal:2',
            'min_days' => 'integer',
            'max_days' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ShippingZone, $this>
     */
    public function zone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'shipping_zone_id');
    }

    /**
     * @return Attribute<float, int>
     */
    protected function baseFeeNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, int>
     */
    protected function perKgFeeNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float|null, int|null>
     */
    protected function freeOverNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value === null ? null : (float) $value / 100,
            set: fn ($value) => $value === null ? null : (int) round($value * 100),
        );
    }
}
