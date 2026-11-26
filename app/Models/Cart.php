<?php

namespace App\Models;

use App\Enums\ProductType;
use Database\Factories\CartFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property User $user
 */
#[Fillable(['user_id'])]
class Cart extends Model
{
    /** @use HasFactory<CartFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<CartItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    /**
     * Serialize cart creation, adds and checkout for one shopper. The owner row
     * exists even before their first cart and survives checkout deleting it.
     * Take this lock before changing the cart or rechecking a checkout snapshot.
     * Profile updates also use this row. Keep pricing calculations, mail and
     * notifications outside the locked transaction.
     */
    public static function lockOwner(int $userId): void
    {
        User::query()->whereKey($userId)->lockForUpdate()->firstOrFail(['id']);
    }

    /**
     * Lines whose product was hidden, went out of stock or was deleted after it
     * was added. Callers must eager load `items.productVariant.product`; a
     * variant or product removed between those eager load queries comes back
     * as a missing relation, which counts as unavailable.
     *
     * @return Collection<int, CartItem>
     */
    public function unavailableItems(): Collection
    {
        return $this->items->reject(
            fn (CartItem $item): bool => $item->productVariant?->product?->isPurchasable() === true,
        )->values();
    }

    /**
     * Check if the cart contains only service items and the total price is 0 or less.
     */
    public function isFreeServiceOrder(): bool
    {
        if ($this->items->isEmpty()) {
            return false;
        }

        $hasPhysicalItems = $this->items->contains(
            fn (CartItem $item) => $item->productVariant->product->type !== ProductType::Service
        );

        if ($hasPhysicalItems) {
            return false;
        }

        $itemsTotal = (float) $this->items->sum(
            fn (CartItem $item): float => (float) $item->productVariant->price_npr * $item->quantity,
        );

        return $itemsTotal <= 0.0;
    }
}
