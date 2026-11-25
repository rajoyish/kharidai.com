<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use App\Casts\WalletCredits;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The share of one top-up lot a purchase consumed.
 *
 * @property int $id
 * @property int $wallet_purchase_id
 * @property int $wallet_top_up_id
 * @property string $credits
 * @property float $cost_npr
 * @property WalletTopUp $topUp
 */
#[Fillable(['wallet_purchase_id', 'wallet_top_up_id', 'credits', 'cost_npr'])]
class WalletPurchaseAllocation extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'credits' => WalletCredits::class,
            'cost_npr' => MoneyNpr::class,
        ];
    }

    /**
     * @return BelongsTo<WalletTopUp, $this>
     */
    public function topUp(): BelongsTo
    {
        return $this->belongsTo(WalletTopUp::class, 'wallet_top_up_id');
    }

    public function creditUnits(): int
    {
        return (int) $this->attributes['credits'];
    }

    public function costPaisa(): int
    {
        return (int) $this->attributes['cost_npr'];
    }
}
