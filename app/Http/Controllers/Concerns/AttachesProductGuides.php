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
     * The admin's view of the order: what the buyer reads, plus any draft still
     * being written. Still withheld until the order is paid, so the panel on the
     * admin page appears exactly when the buyer's does.
     */
    protected function attachAdminDeliveryGuides(Order $order): void
    {
        $this->attachDeliveryGuides($order, includeDrafts: true);
    }

    /**
     * The buyer's view: released guides only.
     */
    protected function attachCustomerDeliveryGuides(Order $order): void
    {
        $this->attachDeliveryGuides($order, includeDrafts: false);
    }

    /**
     * Payment is the gate both audiences share; drafts are the only difference
     * between them. Keeping that in one place is what stops the admin page and
     * the order page from drifting apart.
     */
    private function attachDeliveryGuides(Order $order, bool $includeDrafts): void
    {
        $guides = $order->isPaid()
            ? $this->guidesByProduct($order, publishedOnly: ! $includeDrafts)
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
