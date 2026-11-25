<?php

namespace App\Models;

use App\Casts\MoneyNpr;
use App\Casts\WalletCredits;
use App\Enums\PriceSnapshotSource;
use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property string $name
 * @property string|null $details
 * @property float $price_npr
 * @property float $purchase_price_npr
 * @property int|null $supplier_id
 * @property string|null $supplier_cost_credits
 * @property bool $show_pricing
 * @property int|null $validity_days
 * @property list<string>|null $colors
 * @property list<string>|null $sizes
 * @property float|null $weight_kg
 * @property bool $ships_individually
 * @property int|null $advance_payment_percent
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Product $product
 * @property Supplier|null $supplier
 */
#[Fillable(['product_id', 'name', 'details', 'price_npr', 'purchase_price_npr', 'supplier_id', 'supplier_cost_credits', 'show_pricing', 'validity_days', 'colors', 'sizes', 'weight_kg', 'ships_individually', 'advance_payment_percent'])]
class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory;

    /**
     * The wholesale cost is internal margin data that no storefront, cart, or
     * checkout screen ever renders, yet variants are serialized into the Inertia
     * page payload on all of them — where anything present is readable from the
     * HTML source. Hiding it here keeps it out by default; the admin screens
     * that genuinely display it opt back in with `makeVisible()`.
     *
     * The supplier and its credit cost are the same kind of procurement
     * data, so they are hidden alongside it.
     *
     * @var list<string>
     */
    protected $hidden = ['purchase_price_npr', 'supplier_id', 'supplier_cost_credits'];

    /**
     * Every procurement field an admin screen opts back in to.
     *
     * @var list<string>
     */
    public const PROCUREMENT_FIELDS = ['purchase_price_npr', 'supplier_id', 'supplier_cost_credits'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_npr' => MoneyNpr::class,
            'purchase_price_npr' => MoneyNpr::class,
            'supplier_cost_credits' => WalletCredits::class,
            'validity_days' => 'integer',
            'show_pricing' => 'boolean',
            'colors' => 'array',
            'sizes' => 'array',
            'weight_kg' => 'decimal:2',
            'ships_individually' => 'boolean',
            'advance_payment_percent' => 'integer',
        ];
    }

    /**
     * The advance payment owed up front for one unit of this variant, in NPR,
     * derived from its configured advance percentage of the selling price.
     */
    public function advancePaymentNpr(): float
    {
        if (! $this->advance_payment_percent) {
            return 0.0;
        }

        return round($this->price_npr * $this->advance_payment_percent / 100, 2);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Who this variant is bought from; the supplier's wallet pays for it.
     *
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * @return HasMany<VariantPriceSnapshot, $this>
     */
    public function priceSnapshots(): HasMany
    {
        return $this->hasMany(VariantPriceSnapshot::class);
    }

    /**
     * @return HasOne<VariantPriceSnapshot, $this>
     */
    public function latestCalculatorSnapshot(): HasOne
    {
        return $this->hasOne(VariantPriceSnapshot::class)
            ->ofMany(['id' => 'max'], fn ($query) => $query->where('source', PriceSnapshotSource::Calculator));
    }

    /**
     * @return HasMany<WalletPurchase, $this>
     */
    public function walletPurchases(): HasMany
    {
        return $this->hasMany(WalletPurchase::class);
    }
}
