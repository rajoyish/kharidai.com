<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int $product_variant_id
 * @property float $price
 * @property float $purchase_price
 * @property int $quantity
 * @property array<string, string>|null $selected_options
 * @property array<string, mixed>|null $brief
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Order $order
 * @property ProductVariant $productVariant
 */
#[Fillable(['order_id', 'product_variant_id', 'price', 'purchase_price', 'quantity', 'selected_options', 'brief'])]
class OrderItem extends Model
{
    /** @use HasFactory<OrderItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => MoneyNpr::class,
            'purchase_price' => MoneyNpr::class,
            'selected_options' => 'array',
            'brief' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /**
     * @return HasMany<Subscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * @return HasMany<ServiceEngagement, $this>
     */
    public function serviceEngagements(): HasMany
    {
        return $this->hasMany(ServiceEngagement::class);
    }

    /**
     * The item's name for display: the product and its variant together.
     *
     * The product's name lives on `title` — there is no `name` column. Reading
     * ->name yielded null for every item, because Eloquent answers null for an
     * attribute that does not exist rather than complaining.
     */
    public function displayName(): string
    {
        return $this->productVariant->product->title.' — '.$this->productVariant->name;
    }

    /**
     * The revenue this item actually earned, in NPR. A service item's checkout
     * price is only an estimate; once its engagements have saved invoices, those
     * grand totals are what the customer owes. Everything else earns price × quantity.
     */
    public function revenueNpr(): float
    {
        $invoiced = $this->invoicedEngagements();

        if ($invoiced->isEmpty()) {
            return round($this->price * $this->quantity, 2);
        }

        return round($invoiced->sum(
            fn (ServiceEngagement $engagement): float => $engagement->grandTotalNpr(),
        ), 2);
    }

    /**
     * The cost of goods for this item, in NPR. Invoiced service engagements carry
     * their own snapshotted purchase price, one per unit of work delivered.
     */
    public function costNpr(): float
    {
        $invoiced = $this->invoicedEngagements();

        if ($invoiced->isEmpty()) {
            return round($this->purchase_price * $this->quantity, 2);
        }

        return round($invoiced->sum(
            fn (ServiceEngagement $engagement): float => $engagement->purchase_price_npr,
        ), 2);
    }

    /**
     * Revenue minus cost of goods, in NPR. This is the figure tithes are levied on.
     */
    public function profitNpr(): float
    {
        return round($this->revenueNpr() - $this->costNpr(), 2);
    }

    /**
     * The engagements whose invoice has been saved. Callers iterating many items
     * must eager load `serviceEngagements`; loading it here instead would hide the
     * resulting N+1 from Eloquent's lazy-loading guard.
     *
     * @return Collection<int, ServiceEngagement>
     */
    private function invoicedEngagements(): Collection
    {
        return $this->serviceEngagements->filter(
            fn (ServiceEngagement $engagement): bool => filled($engagement->line_items),
        );
    }
}
