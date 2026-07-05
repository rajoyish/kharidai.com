<?php

namespace App\Services\Shipping;

use App\Models\CartItem;
use App\Models\OrderItem;
use App\Models\ShippingZone;
use Illuminate\Support\Collection;

class ShippingCalculator
{
    /**
     * Calculate the shipping fee (in NPR) for a set of physical cart/order line
     * items delivered to the given zone.
     *
     * Each line item must expose a `quantity`, its `productVariant.price_npr`,
     * and its `productVariant.product.physicalDetail` relation (eager-load them
     * before calling to avoid N+1 queries).
     *
     * Rules, applied per line item:
     *  - free_shipping product  → contributes nothing
     *  - flat_shipping_npr set  → flat fee × quantity (no weight, no base fee)
     *  - otherwise (weight)     → per_kg_fee × ceil(total kg) plus the zone base fee
     *
     * A free-shipping threshold (`free_over_npr`) waives the entire fee once the
     * physical goods subtotal reaches it.
     *
     * @param  Collection<int, CartItem|OrderItem>  $physicalItems
     */
    public function forItems(ShippingZone $zone, Collection $physicalItems): float
    {
        $rate = $zone->rate;

        if ($rate === null || $physicalItems->isEmpty()) {
            return 0.0;
        }

        $subtotal = $physicalItems->sum(
            fn ($item): float => (float) $item->productVariant->price_npr * $item->quantity,
        );

        if ($rate->free_over_npr !== null && $subtotal >= $rate->free_over_npr) {
            return 0.0;
        }

        $hasWeightBasedItem = false;
        $variable = 0.0;

        foreach ($physicalItems as $item) {
            $detail = $item->productVariant->product->physicalDetail;
            $quantity = (int) $item->quantity;

            if ($detail !== null && $detail->free_shipping) {
                continue;
            }

            if ($detail !== null && $detail->flat_shipping_npr !== null) {
                $variable += (float) $detail->flat_shipping_npr * $quantity;

                continue;
            }

            $hasWeightBasedItem = true;
            $grams = (int) ($detail->weight_grams ?? 0) * $quantity;
            $billableKg = (int) ceil($grams / 1000);
            $variable += (float) $rate->per_kg_fee_npr * $billableKg;
        }

        $base = $hasWeightBasedItem ? (float) $rate->base_fee_npr : 0.0;

        return round($base + $variable, 2);
    }

    /**
     * Compute the shipping fee for every provided zone, keyed by zone id.
     *
     * @param  Collection<int, ShippingZone>  $zones
     * @param  Collection<int, CartItem|OrderItem>  $physicalItems
     * @return array<int, float>
     */
    public function feesForZones(Collection $zones, Collection $physicalItems): array
    {
        return $zones
            ->mapWithKeys(fn (ShippingZone $zone): array => [
                $zone->id => $this->forItems($zone, $physicalItems),
            ])
            ->all();
    }
}
