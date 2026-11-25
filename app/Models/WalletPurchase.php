<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use App\Casts\WalletCredits;
use Database\Factories\WalletPurchaseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A purchase paid from a supplier's wallet. `cost_npr` is the actual cost
 * basis of the credits consumed, taken from the oldest lots first, so it
 * reflects what those credits really cost rather than today's rate.
 *
 * @property int $id
 * @property int $supplier_id
 * @property int|null $product_variant_id
 * @property int|null $user_id
 * @property string|null $description
 * @property string|null $reference
 * @property int $quantity
 * @property string $unit_cost_credits
 * @property string $credits_spent
 * @property float $cost_npr
 * @property Carbon $purchased_at
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property ProductVariant|null $variant
 * @property Supplier $supplier
 */
#[Fillable(['supplier_id', 'product_variant_id', 'user_id', 'description', 'reference', 'quantity', 'unit_cost_credits', 'credits_spent', 'cost_npr', 'purchased_at', 'notes'])]
class WalletPurchase extends Model
{
    /** @use HasFactory<WalletPurchaseFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_cost_credits' => WalletCredits::class,
            'credits_spent' => WalletCredits::class,
            'cost_npr' => MoneyNpr::class,
            'purchased_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
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
     * @return HasMany<WalletPurchaseAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(WalletPurchaseAllocation::class);
    }

    /**
     * The landed NPR cost of one unit of this purchase.
     */
    public function unitCostNpr(): float
    {
        return round($this->cost_npr / max(1, $this->quantity), 2);
    }
}
