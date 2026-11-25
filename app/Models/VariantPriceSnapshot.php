<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use App\Casts\WalletCredits;
use App\Enums\CostBasis;
use App\Enums\PriceRounding;
use App\Enums\PriceSnapshotSource;
use Database\Factories\VariantPriceSnapshotFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A variant's selling price at a point in time, and the cost it was set
 * against. Rows are only ever appended, so the price curve, cost curve and
 * margin trend for a variant can be read back long after its price changed.
 *
 * @property int $id
 * @property int $product_variant_id
 * @property int|null $user_id
 * @property int|null $supplier_id
 * @property PriceSnapshotSource $source
 * @property float $selling_price_npr
 * @property float|null $purchase_price_npr
 * @property float|null $landed_cost_npr
 * @property string|null $supplier_cost_credits
 * @property string|null $npr_per_credit
 * @property CostBasis|null $cost_basis
 * @property float|null $target_profit_npr
 * @property string|null $target_margin_percent
 * @property float|null $extra_cost_npr
 * @property PriceRounding|null $rounding
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['product_variant_id', 'user_id', 'supplier_id', 'source', 'selling_price_npr', 'purchase_price_npr', 'landed_cost_npr', 'supplier_cost_credits', 'npr_per_credit', 'cost_basis', 'target_profit_npr', 'target_margin_percent', 'extra_cost_npr', 'rounding', 'notes'])]
class VariantPriceSnapshot extends Model
{
    /** @use HasFactory<VariantPriceSnapshotFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => PriceSnapshotSource::class,
            'selling_price_npr' => MoneyNpr::class,
            'purchase_price_npr' => MoneyNpr::class,
            'landed_cost_npr' => MoneyNpr::class,
            'supplier_cost_credits' => WalletCredits::class,
            'npr_per_credit' => 'decimal:6',
            'cost_basis' => CostBasis::class,
            'target_profit_npr' => MoneyNpr::class,
            'target_margin_percent' => 'decimal:2',
            'extra_cost_npr' => MoneyNpr::class,
            'rounding' => PriceRounding::class,
        ];
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * The unit cost this price was measured against. A calculator snapshot
     * knows the true landed cost; a manual edit only knows the purchase price
     * typed alongside it.
     */
    public function costNpr(): ?float
    {
        if ($this->landed_cost_npr !== null) {
            return round($this->landed_cost_npr + ($this->extra_cost_npr ?? 0), 2);
        }

        return $this->purchase_price_npr;
    }
}
