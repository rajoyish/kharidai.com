<?php

namespace App\Services\Shipping;

use App\Models\CartItem;
use App\Models\OrderItem;
use App\Models\ShippingRate;
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
     * Fees are built by parcel. Each parcel is charged the zone base fee plus
     * `per_kg_fee × ceil(parcel kg)`:
     *  - free_shipping product   → contributes nothing
     *  - flat_shipping_npr set   → flat fee × quantity (unpacked)
     *  - ships_individually unit → one parcel per unit
     *  - otherwise (combinable)  → units are pooled and split into as few parcels
     *                              as the zone's `parcel_capacity_kg` allows
     *
     * When the zone has no `parcel_capacity_kg`, nothing combines and every
     * weight-based unit takes its own parcel. Billable weight is the selected
     * variant's own weight in kilograms, falling back to the product's physical
     * detail weight when the variant carries none.
     *
     * A free-shipping threshold (`free_over_npr`) waives the entire fee once the
     * physical goods subtotal reaches it.
     *
     * @param  Collection<int, CartItem>|Collection<int, OrderItem>  $physicalItems
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

        $capacity = $rate->parcel_capacity_kg !== null ? (float) $rate->parcel_capacity_kg : 0.0;

        $total = 0.0;
        $combinableKg = 0.0;

        foreach ($physicalItems as $item) {
            $detail = $item->productVariant->product->physicalDetail;
            $quantity = (int) $item->quantity;

            if ($detail !== null && $detail->free_shipping) {
                continue;
            }

            if ($detail !== null && $detail->flat_shipping_npr !== null) {
                $total += (float) $detail->flat_shipping_npr * $quantity;

                continue;
            }

            $unitKg = (float) ($item->productVariant->weight_kg
                ?? $detail?->weight_kg ?? 0);

            $shipsAlone = $capacity <= 0 || $item->productVariant->ships_individually;

            if ($shipsAlone) {
                $total += $quantity * $this->parcelFee($rate, $unitKg);

                continue;
            }

            $combinableKg += $unitKg * $quantity;
        }

        if ($combinableKg > 0) {
            $parcels = (int) ceil($combinableKg / $capacity);
            $total += $parcels * (float) $rate->base_fee_npr
                + (float) $rate->per_kg_fee_npr * (int) ceil($combinableKg);
        }

        return round($total, 2);
    }

    /**
     * The fee (in NPR) for a single parcel of the given weight: the zone base
     * fee plus the per-kg fee applied to the weight rounded up to whole kg.
     */
    private function parcelFee(ShippingRate $rate, float $kg): float
    {
        return (float) $rate->base_fee_npr + (float) $rate->per_kg_fee_npr * (int) ceil($kg);
    }

    /**
     * Compute the shipping fee for every provided zone, keyed by zone id.
     *
     * @param  Collection<int, ShippingZone>  $zones
     * @param  Collection<int, CartItem>|Collection<int, OrderItem>  $physicalItems
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
