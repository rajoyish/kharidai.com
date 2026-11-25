<?php

namespace App\Models;

use App\Enums\PurchasePlatform;
use Database\Factories\SupplierFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Who a product is bought from, and the prepaid wallet held with them.
 *
 * Orders are placed on `platform`. The wallet is funded by top-ups, each of
 * which becomes a cost lot, and drawn down by purchases. Unspent credits
 * carry forward, so the wallet usually holds credits bought at several
 * different effective rates at once.
 *
 * @property int $id
 * @property string $name
 * @property PurchasePlatform $platform
 * @property string|null $contact
 * @property string|null $shop_url
 * @property string $voucher_currency
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'platform', 'contact', 'shop_url', 'voucher_currency', 'notes'])]
class Supplier extends Model
{
    /** @use HasFactory<SupplierFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'platform' => PurchasePlatform::class,
        ];
    }

    /**
     * @return HasMany<WalletTopUp, $this>
     */
    public function topUps(): HasMany
    {
        return $this->hasMany(WalletTopUp::class);
    }

    /**
     * @return HasOne<WalletTopUp, $this>
     */
    public function latestTopUp(): HasOne
    {
        return $this->hasOne(WalletTopUp::class)->ofMany(['topped_up_at' => 'max', 'id' => 'max']);
    }

    /**
     * @return HasMany<WalletPurchase, $this>
     */
    public function purchases(): HasMany
    {
        return $this->hasMany(WalletPurchase::class);
    }

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Whether nothing has been recorded with this supplier yet, so removing
     * it erases no cost history.
     */
    public function isUnused(): bool
    {
        return ! $this->topUps()->exists() && ! $this->purchases()->exists();
    }
}
