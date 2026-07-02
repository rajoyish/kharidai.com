<?php

namespace App\Models;

use Database\Factories\SubscriptionFactory;
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
 * @property int|null $days_left
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property string|null $user_label
 * @property User $user
 * @property Order $order
 * @property OrderItem|null $orderItem
 */
#[Fillable(['user_id', 'order_id', 'order_item_id', 'start_date', 'end_date', 'user_label'])]
class Subscription extends Model
{
    /** @use HasFactory<SubscriptionFactory> */
    use HasFactory;

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['days_left'];

    // Booted method removed because days_left is no longer a physical column

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

    /**
     * @return Attribute<int|null, never>
     */
    protected function daysLeft(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->calculateDaysLeft(),
        );
    }

    private function calculateDaysLeft(): ?int
    {
        if ($this->end_date === null) {
            return null;
        }

        $now = now()->startOfDay();
        $start = $this->start_date ? $this->start_date->copy()->startOfDay() : $now;
        $end = $this->end_date->copy()->startOfDay();

        if ($now->lessThan($start)) {
            // Subscription has not started yet; days left is the total duration
            return max($start->diffInDays($end, false), 0);
        }

        // Subscription is active; days left is from today to the end date
        return max($now->diffInDays($end, false), 0);
    }
}
