<?php

use App\Jobs\SendMetaPurchaseEvent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.meta.pixel_id' => '2087629375156375',
        'services.meta.conversions_api_token' => 'test-token',
        'services.meta.graph_version' => 'v21.0',
    ]);
});

it('reports a purchase when an order becomes completed', function () {
    Bus::fake();

    $order = Order::factory()->create(['status' => 'processing']);

    $order->update(['status' => 'completed']);

    Bus::assertDispatchedAfterResponse(SendMetaPurchaseEvent::class);
});

it('reports a purchase for an order created already completed', function () {
    Bus::fake();

    Order::factory()->create(['status' => 'completed']);

    Bus::assertDispatchedAfterResponse(SendMetaPurchaseEvent::class);
});

it('does not report a purchase for an order that never completes', function () {
    Bus::fake();

    $order = Order::factory()->create(['status' => 'processing']);

    $order->update(['status' => 'delivering']);

    Bus::assertNotDispatchedAfterResponse(SendMetaPurchaseEvent::class);
});

it('does not report the same purchase twice when a completed order is edited', function () {
    $order = Order::factory()->create(['status' => 'processing']);
    $order->update(['status' => 'completed']);

    // Only edits made *after* completion should be silent — the completion above
    // already reported. An admin touching a completed order must not re-bill Meta.
    Bus::fake();

    $order->update(['status' => 'completed', 'order_number' => 'EDITED-1']);

    Bus::assertNotDispatchedAfterResponse(SendMetaPurchaseEvent::class);
});

it('posts a Purchase event with hashed identifiers and the order total', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['events_received' => 1]),
    ]);

    $user = User::factory()->create(['email' => 'Buyer@Example.com']);
    $order = Order::factory()->for($user)->create(['status' => 'completed']);

    (new SendMetaPurchaseEvent($order->id))->handle();

    Http::assertSent(function ($request) use ($user, $order) {
        $event = $request['data'][0];

        expect($request->url())->toContain('/v21.0/2087629375156375/events')
            ->and($request['access_token'])->toBe('test-token')
            ->and($event['event_name'])->toBe('Purchase')
            ->and($event['event_id'])->toBe("order-{$order->id}")
            ->and($event['action_source'])->toBe('website')
            ->and($event['custom_data']['currency'])->toBe('NPR')
            ->and($event['custom_data']['value'])->toBe($order->displayTotalNpr());

        // Normalised (trimmed + lowercased) before hashing, per Meta's spec.
        expect($event['user_data']['em'][0])
            ->toBe(hash('sha256', 'buyer@example.com'))
            ->and($event['user_data']['em'][0])->not->toContain('@')
            ->and($event['user_data']['external_id'][0])
            ->toBe(hash('sha256', (string) $user->id));

        return true;
    });
});

it('reports the invoiced total for a service order', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['events_received' => 1]),
    ]);

    $order = Order::factory()->create(['status' => 'completed', 'shipping_total' => 0]);

    /*
     * Two items, not one, and that is load-bearing. The value Meta receives is
     * derived from each item's engagements, so failing to eager-load them is a
     * lazy-load violation — but Eloquent only arms that guard once a query
     * hydrates more than one model (see LazyLoadingViolationTest). With a single
     * item the missing eager-load would slip through silently.
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

    (new SendMetaPurchaseEvent($order->id))->handle();

    Http::assertSent(function ($request) {
        $event = $request['data'][0];

        // The invoice supersedes that item's 500 snapshot price: 9,000 + 13% tax =
        // 10,170, plus the second item's untouched 500.
        expect($event['custom_data']['value'])->toBe(10670.0)
            ->and($event['custom_data']['num_items'])->toBe(2);

        return true;
    });
});

it('never sends raw personal data to Meta', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['events_received' => 1]),
    ]);

    $user = User::factory()->create(['email' => 'buyer@example.com']);
    $order = Order::factory()->for($user)->create(['status' => 'completed']);

    (new SendMetaPurchaseEvent($order->id))->handle();

    Http::assertSent(function ($request) use ($user) {
        $body = json_encode($request->data());

        expect($body)->not->toContain($user->email)
            ->and($body)->not->toContain($user->name);

        return true;
    });
});

it('sends nothing when the Conversions API token is not configured', function () {
    Http::fake();

    config(['services.meta.conversions_api_token' => null]);

    $order = Order::factory()->create(['status' => 'completed']);

    (new SendMetaPurchaseEvent($order->id))->handle();

    Http::assertNothingSent();
});

it('routes events to Test Events when a test event code is set', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1])]);

    config(['services.meta.test_event_code' => 'TEST53295']);

    $order = Order::factory()->create(['status' => 'completed']);

    (new SendMetaPurchaseEvent($order->id))->handle();

    Http::assertSent(fn ($request) => $request['test_event_code'] === 'TEST53295');
});

it('omits the test event code when none is set', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1])]);

    config(['services.meta.test_event_code' => null]);

    $order = Order::factory()->create(['status' => 'completed']);

    (new SendMetaPurchaseEvent($order->id))->handle();

    // A test code left set in production would quietly exclude every real purchase
    // from attribution and ad optimisation — the failure mode is invisible.
    Http::assertSent(fn ($request) => ! array_key_exists('test_event_code', $request->data()));
});

it('costs no database queries when the Conversions API is not configured', function () {
    Http::fake();

    config(['services.meta.conversions_api_token' => null]);

    $order = Order::factory()->create(['status' => 'completed']);

    // The job holds an order id, not an Order — a model property would be
    // re-fetched on every deserialize, adding a query per completed order even
    // on servers that never send to Meta. That regression broke the admin
    // order-list N+1 guard once; this pins it shut.
    $queries = 0;
    DB::listen(function () use (&$queries): void {
        $queries++;
    });

    (new SendMetaPurchaseEvent($order->id))->handle();

    expect($queries)->toBe(0);
});
