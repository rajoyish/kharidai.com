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
 * left alone), and a digital order whose number the copy-to-clipboard spec
 * reads back off the clipboard.
 */
class PlaywrightSeeder extends Seeder
{
    public const ADMIN_EMAIL = 'playwright-admin@example.test';

    public const PRODUCT_TO_DELETE = 'Playwright Delete Me';

    public const PRODUCT_TO_KEEP = 'Playwright Keep Me';

    public const ORDER_NUMBER = 'ORD-PLAYWRIGHT';

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
    }
}
