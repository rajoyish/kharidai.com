<?php

use App\Mail\OrderPlaced;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Pull the item row's three cells out of the rendered mail, so an assertion can
 * speak about columns rather than about whether a string appears somewhere on the
 * page — a name that bleeds into the next column still "contains" its own text.
 *
 * @return list<string>
 */
function itemRowCells(string $html): array
{
    preg_match('/<tbody.*?<tr>(.*?)<\/tr>/s', $html, $row);

    preg_match_all('/<td[^>]*>(.*?)<\/td>/s', $row[1] ?? '', $cells);

    return array_map(
        fn (string $cell): string => trim(html_entity_decode(strip_tags($cell))),
        $cells[1] ?? [],
    );
}

it('keeps a name containing a pipe inside its own column', function () {
    $order = Order::factory()->create(['shipping_total' => 0]);

    $product = Product::factory()->create(['title' => 'Kaspersky']);

    OrderItem::factory()->create([
        'order_id' => $order->id,
        /*
         * A real variant name from production. A pipe is Markdown's column
         * separator, so left unescaped it shatters the row: the name spills into
         * the Qty column, quantity lands under Price, and the price falls off the
         * end of the row entirely.
         */
        'product_variant_id' => ProductVariant::factory()->for($product)->create([
            'name' => 'Activation Link | 18 Months',
        ]),
        'price' => 2100,
        'quantity' => 1,
    ]);

    $cells = itemRowCells((new OrderPlaced($order->fresh()))->render());

    expect($cells)->toHaveCount(3)
        ->and($cells[0])->toBe('Kaspersky — Activation Link | 18 Months')
        ->and($cells[1])->toBe('1')
        ->and($cells[2])->toBe('Rs. 2,100');
});

it('names the item by the product title, which is not called name', function () {
    $order = Order::factory()->create(['shipping_total' => 0]);

    $product = Product::factory()->create(['title' => 'Kaspersky']);

    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->for($product)->create([
            'name' => 'Activation Link',
        ]),
        'price' => 2100,
        'quantity' => 1,
    ]);

    /*
     * products has a `title` column and no `name` column. Eloquent answers null
     * for an attribute that does not exist rather than raising, so reading ->name
     * silently dropped the product from every order email.
     */
    $cells = itemRowCells((new OrderPlaced($order->fresh()))->render());

    expect($cells[0])->toBe('Kaspersky — Activation Link')
        ->and($cells[0])->not->toStartWith('—');
});
