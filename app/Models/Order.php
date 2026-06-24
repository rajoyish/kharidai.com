<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $order_number
 * @property int $user_id
 * @property string $status
 * @property float $total_amount
 * @property string $currency
 * @property array|null $additional_data
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property User $user
 */
#[Fillable(['order_number', 'user_id', 'status', 'total_amount', 'currency', 'additional_data'])]
class Order extends Model
{
    /** @use HasFactory<\Database\Factories\OrderFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'additional_data' => 'array',
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
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasOne<PaymentReceipt, $this>
     */
    public function paymentReceipt(): HasOne
    {
        return $this->hasOne(PaymentReceipt::class);
    }

    /**
     * @return HasMany<OrderCredential, $this>
     */
    public function credentials(): HasMany
    {
        return $this->hasMany(OrderCredential::class);
    }

    /**
     * @return HasMany<OrderMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(OrderMessage::class);
    }
}
