<?php

namespace App\Models;

use Database\Factories\SubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
 * @property-read int|null $days_left
 * @property-read bool $is_expired
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property string|null $user_label
 * @property User $user
 * @property Order $order
 * @property OrderItem|null $orderItem
 */
#[Appends(['days_left', 'is_expired'])]
#[Fillable(['user_id', 'order_id', 'order_item_id', 'start_date', 'end_date', 'user_label'])]
class Subscription extends Model
{
    /** @use HasFactory<SubscriptionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
        ];
    }

    /**
     * @return Attribute<int|null, never>
     */
    protected function daysLeft(): Attribute
    {
        return Attribute::make(
            get: fn (): ?int => $this->calculateDaysLeft(),
        );
    }

    /**
     * @return Attribute<bool, never>
     */
    protected function isExpired(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->hasExpired(),
        );
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
        if ($this->end_date === null) {
            return null;
        }

        $comparisonStart = $this->start_date?->isFuture() === true
            ? $this->start_date->copy()->startOfDay()
            : today()->startOfDay();

        return max(
            $comparisonStart->diffInDays(
                $this->end_date->copy()->startOfDay(),
                false,
            ),
            0,
        );
    }

    private function hasExpired(): bool
    {
        if ($this->end_date === null) {
            return false;
        }

        return $this->end_date->copy()->startOfDay()->lt(now()->startOfDay());
    }
}
