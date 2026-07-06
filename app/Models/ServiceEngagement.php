<?php

namespace App\Models;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\PricingStrategy;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Services\Engagements\EngagementStateMachine;
use App\Services\Pricing\PricingStrategy as PricingStrategyContract;
use Database\Factories\ServiceEngagementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $product_id
 * @property int|null $product_variant_id
 * @property int|null $order_item_id
 * @property EngagementSource $source
 * @property int|null $created_by
 * @property EngagementStatus $status
 * @property float $price_npr
 * @property float $purchase_price_npr
 * @property PricingStrategy|null $pricing_strategy
 * @property array<string, mixed>|null $pricing_config
 * @property Carbon|null $contract_signed_at
 * @property float $advance_required_npr
 * @property float $advance_paid_npr
 * @property Carbon|null $advance_paid_at
 * @property array<string, mixed>|null $measurement
 * @property float $calculated_cost_npr
 * @property float|null $agreed_price_npr
 * @property array<string, mixed>|null $brief
 * @property string|null $delivery_note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property User $user
 * @property Product|null $product
 * @property ProductVariant|null $productVariant
 * @property OrderItem|null $orderItem
 * @property User|null $assignedBy
 */
#[Fillable([
    'user_id',
    'product_id',
    'product_variant_id',
    'order_item_id',
    'source',
    'created_by',
    'status',
    'price_npr',
    'purchase_price_npr',
    'pricing_strategy',
    'pricing_config',
    'contract_signed_at',
    'advance_required_npr',
    'advance_paid_npr',
    'advance_paid_at',
    'measurement',
    'calculated_cost_npr',
    'agreed_price_npr',
    'brief',
    'delivery_note',
])]
class ServiceEngagement extends Model
{
    /** @use HasFactory<ServiceEngagementFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => EngagementSource::class,
            'status' => EngagementStatus::class,
            'pricing_strategy' => PricingStrategy::class,
            'pricing_config' => 'array',
            'measurement' => 'array',
            'brief' => 'array',
            'contract_signed_at' => 'datetime',
            'advance_paid_at' => 'datetime',
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
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /**
     * @return BelongsTo<OrderItem, $this>
     */
    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @param  Builder<ServiceEngagement>  $query
     * @return Builder<ServiceEngagement>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', [
            EngagementStatus::Completed->value,
            EngagementStatus::Cancelled->value,
        ]);
    }

    /**
     * The calculator for this engagement's snapshotted pricing terms.
     */
    public function calculator(): PricingStrategyContract
    {
        return ($this->pricing_strategy ?? PricingStrategy::PerHour)->calculator();
    }

    /**
     * The final cost in NPR for a candidate measurement, using the snapshot terms.
     *
     * @param  array<string, mixed>  $measurement
     */
    public function calculateCost(array $measurement): float
    {
        return $this->calculator()->calculate($this->pricing_config ?? [], $measurement);
    }

    /**
     * Record the signed contract and advance to the next gate.
     */
    public function signContract(EngagementStateMachine $machine): void
    {
        if ($this->status !== EngagementStatus::PendingContract) {
            throw InvalidEngagementTransitionException::between($this->status, EngagementStatus::AwaitingAdvance);
        }

        $this->update(['contract_signed_at' => now()]);
        $machine->transition($this, $machine->afterContractStatus($this));
    }

    /**
     * Record an advance payment (NPR) and, when paid in full, begin the work.
     */
    public function recordAdvance(EngagementStateMachine $machine, float $amountNpr): void
    {
        if ($this->status !== EngagementStatus::AwaitingAdvance) {
            throw InvalidEngagementTransitionException::between($this->status, EngagementStatus::InProgress);
        }

        $this->update([
            'advance_paid_npr' => $amountNpr,
            'advance_paid_at' => now(),
        ]);
        $machine->transition($this, EngagementStatus::InProgress);
    }

    /**
     * Record the post-completion measurement, compute the cost, and open negotiation.
     *
     * @param  array<string, mixed>  $measurement
     */
    public function recordMeasurement(EngagementStateMachine $machine, array $measurement): void
    {
        $this->ensureCanReach(EngagementStatus::Negotiation);

        $this->update([
            'measurement' => $measurement,
            'calculated_cost_npr' => $this->calculateCost($measurement),
        ]);
        $machine->transition($this, EngagementStatus::Negotiation);
    }

    /**
     * Lock in the negotiated final price and move to billing.
     */
    public function agreeOnPrice(EngagementStateMachine $machine, float $amountNpr): void
    {
        $this->ensureCanReach(EngagementStatus::FinalBilling);

        $this->update(['agreed_price_npr' => $amountNpr]);
        $machine->transition($this, EngagementStatus::FinalBilling);
    }

    /**
     * Guard a lifecycle mutation so an illegal call never persists a stray cost
     * or price before the transition itself is rejected.
     *
     * @throws InvalidEngagementTransitionException
     */
    private function ensureCanReach(EngagementStatus $to): void
    {
        if (! $this->status->canTransitionTo($to)) {
            throw InvalidEngagementTransitionException::between($this->status, $to);
        }
    }

    /**
     * The balance still owed after the advance, in NPR.
     */
    public function outstandingNpr(): float
    {
        return max(0.0, ($this->agreed_price_npr ?? 0.0) - $this->advance_paid_npr);
    }

    /**
     * @return Attribute<float, int>
     */
    protected function priceNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, int>
     */
    protected function purchasePriceNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, int>
     */
    protected function advanceRequiredNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, int>
     */
    protected function advancePaidNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float, int>
     */
    protected function calculatedCostNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => (float) $value / 100,
            set: fn ($value) => (int) round($value * 100),
        );
    }

    /**
     * @return Attribute<float|null, int|null>
     */
    protected function agreedPriceNpr(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value === null ? null : (float) $value / 100,
            set: fn ($value) => $value === null ? null : (int) round($value * 100),
        );
    }
}
