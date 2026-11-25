<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use App\Casts\WalletCredits;
use Database\Factories\WalletTopUpFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One top-up of a supplier's wallet, kept as a cost lot. A voucher with a face value is
 * bought for `amount_paid` (usually above face), converted to NPR at
 * `fx_rate`, and redeemed for `credits_received` after the supplier's own
 * deductions. Purchases draw the lot down oldest first.
 *
 * @property int $id
 * @property int $supplier_id
 * @property string|null $reference
 * @property string $face_value
 * @property string $amount_paid
 * @property string $paid_currency
 * @property string $fx_rate
 * @property float $cost_npr
 * @property float $cost_remaining_npr
 * @property string $credits_received
 * @property string $credits_remaining
 * @property Carbon $topped_up_at
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Supplier $supplier
 */
#[Fillable(['supplier_id', 'reference', 'face_value', 'amount_paid', 'paid_currency', 'fx_rate', 'cost_npr', 'cost_remaining_npr', 'credits_received', 'credits_remaining', 'topped_up_at', 'notes'])]
class WalletTopUp extends Model
{
    /** @use HasFactory<WalletTopUpFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'face_value' => 'decimal:4',
            'amount_paid' => 'decimal:4',
            'fx_rate' => 'decimal:6',
            'cost_npr' => MoneyNpr::class,
            'cost_remaining_npr' => MoneyNpr::class,
            'credits_received' => WalletCredits::class,
            'credits_remaining' => WalletCredits::class,
            'topped_up_at' => 'datetime',
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
     * @return HasMany<WalletPurchaseAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(WalletPurchaseAllocation::class);
    }

    public function creditsReceivedUnits(): int
    {
        return (int) $this->attributes['credits_received'];
    }

    public function creditsRemainingUnits(): int
    {
        return (int) $this->attributes['credits_remaining'];
    }

    public function costPaisa(): int
    {
        return (int) $this->attributes['cost_npr'];
    }

    public function costRemainingPaisa(): int
    {
        return (int) $this->attributes['cost_remaining_npr'];
    }

    /**
     * What one credit from this lot cost in NPR, all markups and deductions
     * included. This is the lot's true funding efficiency.
     */
    public function nprPerCredit(): float
    {
        $creditUnits = $this->creditsReceivedUnits();

        if ($creditUnits === 0) {
            return 0.0;
        }

        return ($this->costPaisa() / 100) / ($creditUnits / WalletCredits::SCALE);
    }

    /**
     * How much above face value the voucher was bought for, as a percentage.
     * Only meaningful when it was paid for in its own currency.
     */
    public function voucherMarkupPercent(string $voucherCurrency): ?float
    {
        if (strtoupper($this->paid_currency) !== strtoupper($voucherCurrency) || (float) $this->face_value <= 0) {
            return null;
        }

        return ((float) $this->amount_paid - (float) $this->face_value) / (float) $this->face_value * 100;
    }

    /**
     * Credits received per unit of face value, as a percentage: how much of
     * the voucher survived the supplier's conversion and fees.
     */
    public function creditYieldPercent(): ?float
    {
        if ((float) $this->face_value <= 0) {
            return null;
        }

        return ($this->creditsReceivedUnits() / WalletCredits::SCALE) / (float) $this->face_value * 100;
    }

    /**
     * Whether no purchase has drawn on this lot yet, so its amounts can still
     * be corrected or the lot removed without rewriting any purchase's cost.
     */
    public function isUntouched(): bool
    {
        return $this->creditsRemainingUnits() === $this->creditsReceivedUnits();
    }
}
