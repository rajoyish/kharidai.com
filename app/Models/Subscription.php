<?php

namespace App\Models;

use Database\Factories\SubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $order_id
 * @property int|null $order_item_id
 * @property Carbon $start_date
 * @property Carbon|null $end_date
 * @property int|null $days_left
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property string|null $user_label
 * @property User $user
 * @property Order $order
 * @property OrderItem|null $orderItem
 */
#[Fillable(['user_id', 'order_id', 'order_item_id', 'start_date', 'end_date', 'days_left', 'user_label'])]
class Subscription extends Model
{
    /** @use HasFactory<SubscriptionFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (Subscription $subscription): void {
            $subscription->days_left = $subscription->calculateDaysLeft();
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'days_left' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<OrderItem, $this>
     */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    private function calculateDaysLeft(): ?int
    {
        if ($this->start_date === null || $this->end_date === null) {
            return null;
        }

        return max(
            $this->start_date->copy()->startOfDay()->diffInDays(
                $this->end_date->copy()->startOfDay(),
                false,
            ),
            0,
        );
    }
}
