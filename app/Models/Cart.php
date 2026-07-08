<?php

namespace App\Models;

use App\Enums\ProductType;
use Database\Factories\CartFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
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
