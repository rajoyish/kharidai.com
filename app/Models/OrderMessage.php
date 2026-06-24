<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int $user_id
 * @property string $message
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Order $order
 * @property User $user
 */
#[Fillable(['order_id', 'user_id', 'message'])]
class OrderMessage extends Model
{
    /** @use HasFactory<\Database\Factories\OrderMessageFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
