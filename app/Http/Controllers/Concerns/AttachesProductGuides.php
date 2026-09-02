<?php

namespace App\Http\Controllers\Concerns;

use App\Enums\ProductType;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductGuide;

/**
 * Puts a product's reusable delivery guides on the order that unlocks them.
 *
 * The whole gate lives here rather than in each controller, so the customer
 * path cannot drift from the admin path and start shipping a draft, a guide for
 * a product the buyer never ordered, or a guide for an order still awaiting
 * payment. Guides have no route of their own; an order page is the only way
 * one reaches a browser.
 *
 * Callers must have loaded `items.productVariant` already — lazy loading is
 * prevented application-wide.
 */
trait AttachesProductGuides
{
    /**
     * Attach every guide behind the order, drafts included, for admin review.
     */
    protected function attachAdminDeliveryGuides(Order $order): void
    {
        $this->setGuidesOnItems($order, $this->guidesByProduct($order, publishedOnly: false));
    }

    /**
     * Attach the guides the buyer has actually earned: published ones, for the
     * products in this order, and only once the order is paid for.
     */
    protected function attachCustomerDeliveryGuides(Order $order): void
    {
        $guides = $order->isPaid()
            ? $this->guidesByProduct($order, publishedOnly: true)
            : [];

        $this->setGuidesOnItems($order, $guides);
    }

    /**
     * The guides for the products in this order, keyed by product id.
     *
     * One query for the whole order: the products repeat across items, and the
     * lazy-loading guard would fire on a per-item lookup anyway.
     *
     * @return array<int, list<ProductGuide>>
     */
    private function guidesByProduct(Order $order, bool $publishedOnly): array
    {
        $productIds = $order->items
            ->map(fn (OrderItem $item): int => $item->productVariant->product_id)
            ->unique()
            ->values();

        if ($productIds->isEmpty()) {
            return [];
        }

        $guides = ProductGuide::query()
            ->whereIn('product_id', $productIds)
            // Filtered on the type here, not just where guides are authored: a
            // product converted to a service keeps its rows, and they must stop
            // being delivered the moment it changes.
            ->whereHas('product', fn ($query) => $query->whereIn('type', ProductType::guideSupportedValues()))
            ->when($publishedOnly, fn ($query) => $query->published())
            ->inReadingOrder()
            ->get();

        $byProduct = [];

        foreach ($guides as $guide) {
            $byProduct[$guide->product_id][] = $guide;
        }

        return $byProduct;
    }

    /**
     * @param  array<int, list<ProductGuide>>  $guidesByProduct
     */
    private function setGuidesOnItems(Order $order, array $guidesByProduct): void
    {
        $order->items->each(function (OrderItem $item) use ($guidesByProduct): void {
            $guides = $guidesByProduct[$item->productVariant->product_id] ?? [];

            $item->setAttribute('delivery_guides', array_map(
                fn (ProductGuide $guide): array => [
                    'id' => $guide->id,
                    'title' => $guide->title,
                    'content' => $guide->content,
                    'is_published' => $guide->is_published,
                ],
                $guides,
            ));
        });
    }
}
