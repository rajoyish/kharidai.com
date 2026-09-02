<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * An order for one buyer holding a single unit of one product.
 *
 * Delivery guides are gated on the order, so most tests around them need the
 * same three rows — order, variant, item — differing only by status.
 */
function orderFor(
    User $buyer,
    Product $product,
    string $status = 'completed',
): Order {
    $order = Order::factory()->create([
        'user_id' => $buyer->id,
        'status' => $status,
    ]);

    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create([
            'product_id' => $product->id,
        ])->id,
        'price' => 500,
        'purchase_price' => 200,
        'quantity' => 1,
    ]);

    return $order;
}
