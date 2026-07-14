<?php

use App\Mail\OrderConfirmation;
use App\Mail\OrderPlaced;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

function orderWithPipedItem(): Order
{
    $order = Order::factory()->create(['shipping_total' => 0]);

    OrderItem::factory()->create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()
            ->for(Product::factory()->create(['title' => 'Google One Pro | 5 TB']))
            ->create(['name' => 'Activation Link | 18 Months']),
        'price' => 2100,
        'quantity' => 1,
    ]);

    return $order->fresh();
}

/**
 * Pull the text/plain part out of a sent message. Rendering the mailable only
 * gives the HTML, so the text part has to be read off the MIME.
 */
function textPartOf(object $mailable): string
{
    Mail::mailer('array')->to('someone@example.test')->sendNow($mailable);

    $message = Mail::getSymfonyTransport()->messages()->last()->getOriginalMessage();

    return (string) $message->getTextBody();
}

it('sends a readable plain-text part, not raw markdown', function (string $mailable) {
    $order = orderWithPipedItem();

    $text = textPartOf(new $mailable($order));

    /*
     * Laravel derives the text part from the markdown source when no text view is
     * given, which hands a text-only client a pipe table — including the backslash
     * escapes that exist only to keep the HTML table from shattering.
     */
    expect($text)
        ->not->toContain('\|')
        ->not->toContain('| :--- |')
        ->not->toContain('<x-mail::');

    // The item still has to be legible, pipes and all.
    expect($text)
        ->toContain('Google One Pro | 5 TB — Activation Link | 18 Months')
        ->toContain('Rs. 2,100');
})->with([
    'customer confirmation' => OrderConfirmation::class,
    'shop alert' => OrderPlaced::class,
]);
