<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use Database\Factories\MonthlyTitheFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $month
 * @property int $year
 * @property float $total_amount
 * @property bool $is_paid
 * @property Carbon|null $paid_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Collection<int, MonthlyTitheItem> $items
 */
#[Fillable(['month', 'year', 'total_amount', 'is_paid', 'paid_at'])]
class MonthlyTithe extends Model
{
    /** @use HasFactory<MonthlyTitheFactory> */
    use HasFactory;

    protected $attributes = [
        'total_amount' => 0,
        'is_paid' => false,
    ];

    /**
     * The per-product settlement records that make up this month's tithe.
     *
     * @return HasMany<MonthlyTitheItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(MonthlyTitheItem::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_amount' => MoneyNpr::class,
            'is_paid' => 'boolean',
            'paid_at' => 'datetime',
        ];
    }
}
