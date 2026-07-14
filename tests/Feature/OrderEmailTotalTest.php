<?php

use App\Mail\OrderPlaced;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('totals a plain order from its line items', function () {
    $order = Order::factory()->create(['shipping_total' => 100]);

    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory(),
        'price' => 250,
        'quantity' => 2,
    ]);

    $html = (new OrderPlaced($order))->render();

    // 250 x 2, plus 100 shipping.
    expect($html)->toContain('Total: Rs. 600');
});

it('renders a service order whose engagement has been invoiced', function () {
    $order = Order::factory()->create(['shipping_total' => 0]);

    /*
     * Two items, not one, and that is load-bearing. Reaching the total means
     * walking each item's serviceEngagements, and if the mailable fails to
     * eager-load them that is a lazy-load violation — but Eloquent only arms the
     * guard once a query hydrates more than one model (see LazyLoadingViolationTest).
     * With a single item the missing eager-load would slip through silently.
     */
    $invoiced = OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory(),
        'price' => 500,
        'quantity' => 1,
    ]);

    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory(),
        'price' => 500,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->finalBilling()->create([
        'order_item_id' => $invoiced->id,
        'tax_rate' => 13.00,
        'line_items' => [
            ['description' => 'Design work', 'quantity' => 1, 'unit_price_npr' => 9000],
        ],
    ]);

    $html = (new OrderPlaced($order->fresh()))->render();

    // The invoice supersedes that item's 500 snapshot price: 9,000 + 13% tax =
    // 10,170, plus the second item's untouched 500.
    expect($html)->toContain('Total: Rs. 10,670');
});
