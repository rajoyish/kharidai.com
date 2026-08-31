<?php

namespace App\Models;

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use Database\Factories\MonthlyTitheItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The settlement state of one record's tithe within a month: either a completed
 * order or an offline service engagement, never both. The amount owed is always
 * recomputed from profit, so only whether it has been paid is stored.
 *
 * @property int $id
 * @property int $monthly_tithe_id
 * @property int|null $order_id
 * @property int|null $service_engagement_id
 * @property bool $is_paid
 * @property Carbon|null $paid_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property MonthlyTithe $monthlyTithe
 * @property Order|null $order
 * @property ServiceEngagement|null $serviceEngagement
 */
#[Fillable(['monthly_tithe_id', 'order_id', 'service_engagement_id', 'is_paid', 'paid_at'])]
class MonthlyTitheItem extends Model
{
    /** @use HasFactory<MonthlyTitheItemFactory> */
    use HasFactory;

    protected $attributes = [
        'is_paid' => false,
    ];

    /**
     * The columns that point this record at the given earning record.
     *
     * @return array{order_id: int|null, service_engagement_id: int|null}
     */
    public static function sourceColumns(string $sourceType, int $sourceId): array
    {
        return $sourceType === CalculateMonthlyProfitAction::SOURCE_ORDER
            ? ['order_id' => $sourceId, 'service_engagement_id' => null]
            : ['order_id' => null, 'service_engagement_id' => $sourceId];
    }

    /**
     * @return BelongsTo<MonthlyTithe, $this>
     */
    public function monthlyTithe(): BelongsTo
    {
        return $this->belongsTo(MonthlyTithe::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<ServiceEngagement, $this>
     */
    public function serviceEngagement(): BelongsTo
    {
        return $this->belongsTo(ServiceEngagement::class);
    }

    /**
     * The key this record settles, matching the one on its breakdown entry.
     */
    public function entryKey(): string
    {
        return $this->order_id !== null
            ? CalculateMonthlyProfitAction::SOURCE_ORDER.':'.$this->order_id
            : CalculateMonthlyProfitAction::SOURCE_SERVICE.':'.$this->service_engagement_id;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_paid' => 'boolean',
            'paid_at' => 'datetime',
        ];
    }
}
