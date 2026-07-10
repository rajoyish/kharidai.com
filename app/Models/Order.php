<?php

namespace App\Models;

use App\Enums\PaymentOption;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
 * @property float $items_total
 * @property float $shipping_total
 * @property float $amount_due_now
 * @property float $balance_due
 * @property PaymentOption|null $payment_option
 * @property int|null $shipping_address_id
 * @property array<string, mixed>|null $additional_data
 * @property bool $can_reupload_receipt
 * @property bool $request_receipt_upload
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property User $user
 * @property Shipment|null $shipment
 * @property ShippingAddress|null $shippingAddress
 */
#[Fillable([
    'order_number',
    'user_id',
    'status',
    'total_amount',
    'items_total',
    'shipping_total',
    'amount_due_now',
    'balance_due',
    'payment_option',
    'shipping_address_id',
    'additional_data',
    'can_reupload_receipt',
    'request_receipt_upload',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'additional_data' => 'array',
            'can_reupload_receipt' => 'boolean',
            'request_receipt_upload' => 'boolean',
            'payment_option' => PaymentOption::class,
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
     * @return HasMany<Subscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
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

    /**
     * @return HasOne<Shipment, $this>
     */
    public function shipment(): HasOne
    {
        return $this->hasOne(Shipment::class);
    }

    /**
     * @return BelongsTo<ShippingAddress, $this>
     */
    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(ShippingAddress::class);
    }

    protected $appends = ['profit'];

    public function getProfitAttribute(): float
    {
        if ($this->status !== 'completed') {
            return 0.0;
        }

        return $this->items->sum(function ($item) {
            return ($item->price - $item->purchase_price) * $item->quantity;
        });
    }

    /**
     * @param  Builder<Order>  $query
     * @return Builder<Order>
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function totalAmount(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value / 100,
            set: fn ($value) => $value * 100,
        );
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function itemsTotal(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function shippingTotal(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function amountDueNow(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, float|int>
     */
    protected function balanceDue(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }
}
