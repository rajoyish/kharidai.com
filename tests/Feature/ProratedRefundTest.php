<?php

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\ProratedRefundIssuedNotification;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    Notification::fake();
    $this->travelTo(CarbonImmutable::create(2026, 11, 20, 12));

    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->customer = User::factory()->create();
});

/**
 * A completed November order selling one Rs. 1,000 item that cost Rs. 400, so it
 * earns Rs. 600 profit and owes Rs. 60 in tithe before any refund.
 */
function refundableOrder(User $customer, string $status = 'completed'): Order
{
    $order = Order::factory()->create([
        'user_id' => $customer->id,
        'status' => $status,
        'total_amount' => 1000,
        'created_at' => CarbonImmutable::create(2026, 11, 5, 10),
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    return $order;
}

/**
 * @return array{amount: float|int|string, refunded_on: string, receipt?: UploadedFile, note?: string}
 */
function refundPayload(array $overrides = []): array
{
    return [
        'amount' => 250,
        'refunded_on' => '2026-11-18',
        'receipt' => UploadedFile::fake()->image('refund.png'),
        'note' => 'Refunded the unused 15 days.',
        ...$overrides,
    ];
}

function novemberOrderEntry(Order $order): array
{
    $entries = app(CalculateMonthlyProfitAction::class)->execute(2026, 11)['entries'];

    return collect($entries)->firstWhere('source_id', $order->id);
}

it('records a prorated refund, stores its receipt and tells the customer', function () {
    $order = refundableOrder($this->customer);

    $response = $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload());

    $response->assertRedirect()->assertSessionHas('success', 'Prorated refund recorded.');

    $order->refresh();
    expect($order->refund_amount)->toBe(250.0)
        ->and($order->refunded_on->toDateString())->toBe('2026-11-18')
        ->and($order->refund_note)->toBe('Refunded the unused 15 days.');
    Storage::disk('public')->assertExists($order->refund_receipt_path);
    Notification::assertSentTo($this->customer, ProratedRefundIssuedNotification::class);
});

it('charges the refund against the order profit and its month tithe', function () {
    $order = refundableOrder($this->customer);

    $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload());

    expect(novemberOrderEntry($order))
        ->profit->toBe(350.0)
        ->tithe->toBe(35.0)
        ->refund->toBe(['amount' => 250.0, 'refunded_on' => '2026-11-18']);
    expect($order->fresh()->load('items.serviceEngagements')->profit)->toBe(350.0);
    expect(MonthlyTithe::query()->where(['year' => 2026, 'month' => 11])->sole()->total_amount)->toBe(35.0);
});

it('requires a receipt screenshot for a new refund', function () {
    $order = refundableOrder($this->customer);

    $response = $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload(['receipt' => null]));

    $response->assertSessionHasErrors(['receipt' => 'The receipt field is required.']);
    expect($order->fresh()->refund_amount)->toBeNull();
    Notification::assertNothingSent();
});

it('rejects a refund larger than the order total', function () {
    $order = refundableOrder($this->customer);

    $response = $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload(['amount' => 1000.01]));

    $response->assertSessionHasErrors(['amount' => 'The refund cannot exceed the order total of Rs. 1,000.00.']);
    expect($order->fresh()->refund_amount)->toBeNull();
});

it('rejects a refund dated outside the order lifetime', function (string $refundedOn, string $message) {
    $order = refundableOrder($this->customer);

    $response = $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload(['refunded_on' => $refundedOn]));

    $response->assertSessionHasErrors(['refunded_on' => $message]);
    expect($order->fresh()->refund_amount)->toBeNull();
})->with([
    'before the order' => ['2026-11-04', 'The refund date cannot be before the order was placed.'],
    'in the future' => ['2026-11-21', 'The refunded on field must be a date before or equal to today.'],
]);

it('refuses to refund an order that was never paid', function () {
    $order = refundableOrder($this->customer, 'pending');

    $response = $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload());

    $response->assertUnprocessable();
    expect($order->fresh()->refund_amount)->toBeNull();
});

it('does not let a customer record a refund', function () {
    $order = refundableOrder($this->customer);

    $response = $this->actingAs($this->customer)
        ->post(route('admin.orders.refund.save', $order), refundPayload());

    $response->assertForbidden();
    expect($order->fresh()->refund_amount)->toBeNull();
});

it('keeps the existing receipt when an edit uploads none, without notifying again', function () {
    $order = refundableOrder($this->customer);
    $this->actingAs($this->admin)->post(route('admin.orders.refund.save', $order), refundPayload());
    $receiptPath = $order->fresh()->refund_receipt_path;

    $response = $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload(['amount' => 300, 'receipt' => null]));

    $response->assertSessionHas('success', 'Prorated refund updated.');
    expect($order->fresh())
        ->refund_amount->toBe(300.0)
        ->refund_receipt_path->toBe($receiptPath);
    Storage::disk('public')->assertExists($receiptPath);
    Notification::assertSentToTimes($this->customer, ProratedRefundIssuedNotification::class, 1);
});

it('deletes the replaced receipt when an edit uploads a new one', function () {
    $order = refundableOrder($this->customer);
    $this->actingAs($this->admin)->post(route('admin.orders.refund.save', $order), refundPayload());
    $oldReceiptPath = $order->fresh()->refund_receipt_path;

    $this->actingAs($this->admin)
        ->post(route('admin.orders.refund.save', $order), refundPayload(['receipt' => UploadedFile::fake()->image('new.png')]));

    Storage::disk('public')->assertMissing($oldReceiptPath);
    Storage::disk('public')->assertExists($order->fresh()->refund_receipt_path);
});

it('removes a refund, restoring the full tithe and deleting its receipt', function () {
    $order = refundableOrder($this->customer);
    $this->actingAs($this->admin)->post(route('admin.orders.refund.save', $order), refundPayload());
    $receiptPath = $order->fresh()->refund_receipt_path;

    $response = $this->actingAs($this->admin)->delete(route('admin.orders.refund.destroy', $order));

    $response->assertSessionHas('success', 'Prorated refund removed.');
    expect($order->fresh())
        ->refund_amount->toBeNull()
        ->refunded_on->toBeNull()
        ->refund_receipt_path->toBeNull();
    Storage::disk('public')->assertMissing($receiptPath);
    expect(novemberOrderEntry($order))->tithe->toBe(60.0)->refund->toBeNull();
});

it('shows the refund on the customer order page and subscriptions', function () {
    $order = refundableOrder($this->customer);
    Subscription::factory()->create([
        'user_id' => $this->customer->id,
        'order_id' => $order->id,
        'order_item_id' => $order->items()->value('id'),
    ]);
    $this->actingAs($this->admin)->post(route('admin.orders.refund.save', $order), refundPayload());

    $this->actingAs($this->customer)
        ->get(route('orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.refund_amount', 250)
            ->where('order.refunded_on', '2026-11-18'));

    $this->actingAs($this->customer)
        ->get(route('subscriptions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('subscriptions.0.order.refund_amount', 250)
            ->where('subscriptions.0.order.refunded_on', '2026-11-18'));
});

it('labels refunded orders on the admin subscriptions page', function () {
    $order = refundableOrder($this->customer);
    Subscription::factory()->create([
        'user_id' => $this->customer->id,
        'order_id' => $order->id,
        'order_item_id' => $order->items()->value('id'),
    ]);
    $this->actingAs($this->admin)->post(route('admin.orders.refund.save', $order), refundPayload());

    $response = $this->actingAs($this->admin)->get(route('admin.subscriptions.index'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('subscriptions.data.0.order.refund_amount', 250)
        ->where('subscriptions.data.0.order.refunded_on', '2026-11-18'));
});
