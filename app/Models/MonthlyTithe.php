<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use Database\Factories\MonthlyTitheFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
