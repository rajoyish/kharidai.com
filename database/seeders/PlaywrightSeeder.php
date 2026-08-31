<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Fixtures for the Playwright browser suite.
 *
 * Seeds the admin that `_test/login-as-admin` logs in as, two products with
 * stable titles the delete-flow spec drives (one it deletes, one it asserts is
 * left alone), a digital order whose number the copy-to-clipboard spec reads
 * back off the clipboard, and a completed physical order the payment-breakdown
 * spec compares the digital one against.
 */
class PlaywrightSeeder extends Seeder
{
    public const ADMIN_EMAIL = 'playwright-admin@example.test';

    public const PRODUCT_TO_DELETE = 'Playwright Delete Me';

    public const PRODUCT_TO_KEEP = 'Playwright Keep Me';

    public const ORDER_NUMBER = 'ORD-PLAYWRIGHT';

    public const COMPLETED_ORDER_NUMBER = 'ORD-PLAYWRIGHT-DONE';

    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'Playwright Admin',
            'email' => self::ADMIN_EMAIL,
            'is_admin' => true,
        ]);

        Product::factory()->create(['title' => self::PRODUCT_TO_DELETE]);
        Product::factory()->create(['title' => self::PRODUCT_TO_KEEP]);

        $order = Order::factory()->create([
            'order_number' => self::ORDER_NUMBER,
            'user_id' => $admin->id,
            'items_total' => 1000,
            'shipping_total' => 0,
            'total_amount' => 1000,
            'amount_due_now' => 1000,
        ]);

        // The orders index buckets by product type, so the order needs an item to
        // be listed at all.
        OrderItem::create([
            'order_id' => $order->id,
            'product_variant_id' => ProductVariant::factory()->create([
                'product_id' => Product::factory()->create(['title' => 'Playwright Digital Product'])->id,
            ])->id,
            'price' => 1000,
            'purchase_price' => 400,
            'quantity' => 1,
        ]);

        $completedOrder = Order::factory()->create([
            'order_number' => self::COMPLETED_ORDER_NUMBER,
            'user_id' => $admin->id,
            'status' => 'completed',
            'items_total' => 2000,
            'shipping_total' => 250,
            'total_amount' => 2250,
            'amount_due_now' => 2250,
        ]);

        OrderItem::create([
            'order_id' => $completedOrder->id,
            'product_variant_id' => ProductVariant::factory()->create([
                'product_id' => Product::factory()->physical()->create(['title' => 'Playwright Physical Product'])->id,
            ])->id,
            'price' => 2000,
            'purchase_price' => 800,
            'quantity' => 1,
        ]);
    }
}
