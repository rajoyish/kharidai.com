<?php

namespace App\Models;

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Casts\MoneyNpr;
use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\PricingStrategy;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Services\Engagements\EngagementStateMachine;
use App\Services\Pricing\PricingStrategy as PricingStrategyContract;
use Carbon\CarbonInterface;
use Database\Factories\ServiceEngagementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
 * @property string|null $project_name
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
 * @property Carbon|null $project_completion_date
 * @property array<string, mixed>|null $measurement
 * @property list<array{label: string, quantity: float, unit_price_npr: float}>|null $line_items
 * @property float $tax_rate
 * @property bool|null $is_paid
 * @property float $calculated_cost_npr
 * @property float|null $agreed_price_npr
 * @property float|null $offline_customer_paid_npr
 * @property float|null $offline_purchase_cost_npr
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
    'project_name',
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
    'project_completion_date',
    'measurement',
    'line_items',
    'tax_rate',
    'is_paid',
    'calculated_cost_npr',
    'agreed_price_npr',
    'offline_customer_paid_npr',
    'offline_purchase_cost_npr',
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
            'price_npr' => MoneyNpr::class,
            'purchase_price_npr' => MoneyNpr::class,
            'advance_required_npr' => MoneyNpr::class,
            'advance_paid_npr' => MoneyNpr::class,
            'calculated_cost_npr' => MoneyNpr::class,
            'agreed_price_npr' => MoneyNpr::class,
            'offline_customer_paid_npr' => MoneyNpr::class,
            'offline_purchase_cost_npr' => MoneyNpr::class,
            'source' => EngagementSource::class,
            'status' => EngagementStatus::class,
            'pricing_strategy' => PricingStrategy::class,
            'pricing_config' => 'array',
            'measurement' => 'array',
            'line_items' => 'array',
            'tax_rate' => 'decimal:2',
            'is_paid' => 'boolean',
            'brief' => 'array',
            'contract_signed_at' => 'datetime',
            'advance_paid_at' => 'datetime',
            'project_completion_date' => 'date',
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
     * Engagements whose offline profit should feed the Monthly Tithe: a settled
     * (paid) engagement with a recorded offline customer payment and a product to
     * attribute the profit to, that is not billed through a standard Order. The
     * order_item_id guard is what keeps its profit from being counted twice — an
     * order-linked engagement earns its tithe through the completed order instead.
     *
     * @param  Builder<ServiceEngagement>  $query
     * @return Builder<ServiceEngagement>
     */
    public function scopeOfflineTithed(Builder $query): Builder
    {
        return $query->whereNull('order_item_id')
            ->whereNotNull('product_id')
            ->whereNotNull('offline_customer_paid_npr')
            ->where('is_paid', true);
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
        if ($this->is_paid) {
            return 0.0;
        }

        return max(0.0, ($this->agreed_price_npr ?? 0.0) - $this->advance_paid_npr);
    }

    /**
     * The invoice subtotal in NPR: the sum of every line item's quantity times
     * its unit price, before tax.
     */
    public function subtotalNpr(): float
    {
        return round(collect($this->line_items ?? [])->sum(
            fn (array $item): float => (float) ($item['quantity'] ?? 0) * (float) ($item['unit_price_npr'] ?? 0),
        ), 2);
    }

    /**
     * The tax owed in NPR: the configured rate applied to the subtotal.
     */
    public function taxNpr(): float
    {
        return round($this->subtotalNpr() * (float) $this->tax_rate / 100, 2);
    }

    /**
     * The invoice grand total in NPR: subtotal plus tax.
     */
    public function grandTotalNpr(): float
    {
        return round($this->subtotalNpr() + $this->taxNpr(), 2);
    }

    /**
     * Whether the invoice is settled. A manual override, when set, wins; else it
     * is derived: an invoice with no billable total is not yet "paid"; once a
     * grand total exists it is paid when nothing is due.
     */
    public function paymentStatus(): string
    {
        if ($this->is_paid !== null) {
            return $this->is_paid ? 'paid' : 'due';
        }

        return $this->grandTotalNpr() > 0 && $this->outstandingNpr() <= 0 ? 'paid' : 'due';
    }

    /**
     * Whether offline payment details have been recorded for this engagement.
     */
    public function hasOfflineFinancials(): bool
    {
        return $this->offline_customer_paid_npr !== null;
    }

    /**
     * The manually tracked profit for an offline engagement, in NPR: what the
     * customer paid minus the admin's purchase cost.
     */
    public function offlineProfitNpr(): float
    {
        return round(($this->offline_customer_paid_npr ?? 0.0) - ($this->offline_purchase_cost_npr ?? 0.0), 2);
    }

    /**
     * The tithe owed on this engagement's offline profit, in NPR.
     */
    public function offlineTitheNpr(): float
    {
        return round($this->offlineProfitNpr() * CalculateMonthlyProfitAction::TITHE_RATE, 2);
    }

    /**
     * The date an offline engagement's profit is attributed to when bucketing it
     * into a tithe month: the recorded completion date, falling back to when the
     * engagement was created.
     */
    public function offlineTitheDate(): ?CarbonInterface
    {
        return $this->project_completion_date ?? $this->created_at;
    }
}
