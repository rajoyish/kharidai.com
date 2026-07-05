<?php

namespace App\Models;

use App\Enums\AdvanceType;
use App\Enums\PricingStrategy;
use App\Services\Pricing\PricingStrategy as PricingStrategyContract;
use Database\Factories\ServiceDetailFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property bool $requires_brief
 * @property int|null $delivery_days
 * @property int|null $revisions
 * @property PricingStrategy $pricing_strategy
 * @property array<string, mixed>|null $pricing_config
 * @property bool $requires_contract
 * @property bool $requires_advance
 * @property AdvanceType|null $advance_type
 * @property int|null $advance_value
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Product $product
 */
#[Fillable([
    'product_id',
    'requires_brief',
    'delivery_days',
    'revisions',
    'pricing_strategy',
    'pricing_config',
    'requires_contract',
    'requires_advance',
    'advance_type',
    'advance_value',
])]
class ServiceDetail extends Model
{
    /** @use HasFactory<ServiceDetailFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requires_brief' => 'boolean',
            'delivery_days' => 'integer',
            'revisions' => 'integer',
            'pricing_strategy' => PricingStrategy::class,
            'pricing_config' => 'array',
            'requires_contract' => 'boolean',
            'requires_advance' => 'boolean',
            'advance_type' => AdvanceType::class,
            'advance_value' => 'integer',
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
     * The calculator that prices this service.
     */
    public function calculator(): PricingStrategyContract
    {
        return $this->pricing_strategy->calculator();
    }

    /**
     * The advance owed before work may begin, in NPR. Percentage advances are
     * computed against an optional estimate base.
     */
    public function advanceAmountNpr(?float $base = null): float
    {
        if (! $this->requires_advance || $this->advance_type === null) {
            return 0.0;
        }

        return match ($this->advance_type) {
            AdvanceType::Fixed => (float) ($this->advance_value ?? 0),
            AdvanceType::Percent => $base === null
                ? 0.0
                : round($base * ((float) ($this->advance_value ?? 0)) / 100, 2),
        };
    }
}
