<?php

use App\Mail\OrderPlaced;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('renders the logo in the header instead of the app name', function () {
    $order = Order::factory()->create();

    $html = (new OrderPlaced($order))->render();

    expect($html)
        ->toContain('cid:logo')
        // The wordmark is the image's alt text now, not a text heading.
        ->toContain('alt="'.config('app.name').'"');
});

it('embeds the logo in the sent message so it renders without a public url', function () {
    $order = Order::factory()->create();

    /*
     * Deliberately not Mail::fake(): faking short-circuits delivery, so the
     * MessageSending listener that embeds the logo never fires and the cid in the
     * header would dangle unnoticed. The array transport runs the real send path
     * and keeps the message in memory.
     */
    Mail::to('shop@example.test')->sendNow(new OrderPlaced($order));

    $sent = Mail::getSymfonyTransport()->messages();
    expect($sent)->toHaveCount(1);

    $mime = $sent->first()->getOriginalMessage()->toString();

    expect($mime)
        ->toContain('Content-Type: image/png')
        ->toContain('Content-Disposition: inline')
        // Symfony rewrites cid:logo to the generated Content-ID; if it did not,
        // the image would be attached but never displayed.
        ->not->toContain('cid:logo');
});
