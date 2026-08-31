<?php

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Enums\ProductType;
use App\Models\MonthlyTithe;
use App\Models\MonthlyTitheItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->user = User::factory()->create();
});

/**
 * One completed order in the given month, earning `price - purchase_price` profit.
 */
function completedOrderIn(User $user, int $year, int $month, ProductVariant $variant, int $price, int $purchasePrice): Order
{
    $order = Order::factory()->create([
        'user_id' => $user->id,
        'status' => 'completed',
        'created_at' => CarbonImmutable::create($year, $month, 10, 10),
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => $price,
        'purchase_price' => $purchasePrice,
        'quantity' => 1,
    ]);

    return $order;
}

/**
 * A tithe only exists off the back of a completed order's profit, so seed the order
 * that earns it and let the sync action derive the row.
 */
function seedTitheFor(User $user, int $year, int $month): MonthlyTithe
{
    completedOrderIn($user, $year, $month, ProductVariant::factory()->create(), 1000, 400);

    return syncTithe($year, $month);
}

/**
 * Seed several completed orders into one month, each for a different product, so
 * the month holds several entries that settle independently. The nth order earns
 * 600 * n profit and owes 60 * n in tithe.
 *
 * @return list<Order>
 */
function seedOrdersForMonth(User $user, int $year, int $month, int $count): array
{
    $orders = [];

    for ($index = 1; $index <= $count; $index++) {
        $orders[] = completedOrderIn(
            $user,
            $year,
            $month,
            ProductVariant::factory()->create(),
            1000 * $index,
            400 * $index,
        );
    }

    syncTithe($year, $month);

    return $orders;
}

function syncTithe(int $year, int $month): MonthlyTithe
{
    app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create($year, $month, 1));

    return MonthlyTithe::query()
        ->where('year', $year)
        ->where('month', $month)
        ->sole();
}

it('groups completed order profit into monthly tithes by month', function () {
    $julyFirstOrder = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-07-10 10:00:00',
    ]);
    $julySecondOrder = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-07-22 10:00:00',
    ]);
    $augustOrder = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-08-01 10:00:00',
    ]);

    $variant = ProductVariant::factory()->create();

    OrderItem::create([
        'order_id' => $julyFirstOrder->id,
        'product_variant_id' => $variant->id,
        'price' => 1000,
        'purchase_price' => 600,
        'quantity' => 2,
    ]);
    OrderItem::create([
        'order_id' => $julySecondOrder->id,
        'product_variant_id' => $variant->id,
        'price' => 500,
        'purchase_price' => 300,
        'quantity' => 1,
    ]);
    OrderItem::create([
        'order_id' => $augustOrder->id,
        'product_variant_id' => $variant->id,
        'price' => 900,
        'purchase_price' => 600,
        'quantity' => 1,
    ]);

    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $julyFirstOrder), [
        'status' => 'completed',
    ])->assertRedirect();
    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $julySecondOrder), [
        'status' => 'completed',
    ])->assertRedirect();
    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $augustOrder), [
        'status' => 'completed',
    ])->assertRedirect();

    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
        'total_amount' => 10000,
    ]);
    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 8,
        'total_amount' => 3000,
    ]);
});

it('removes a monthly tithe when the last completed order for that month is reverted', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-07-18 10:00:00',
    ]);
    $variant = ProductVariant::factory()->create();

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1200,
        'purchase_price' => 700,
        'quantity' => 1,
    ]);

    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $order), [
        'status' => 'completed',
    ])->assertRedirect();

    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
        'total_amount' => 5000,
    ]);

    $this->actingAs($this->admin)->patch(route('admin.orders.status.update', $order), [
        'status' => 'pending',
    ])->assertRedirect();

    $this->assertDatabaseMissing('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
    ]);
});

it('lists one entry per completed order, tithing ten percent of its profit', function () {
    [$smaller, $larger] = seedOrdersForMonth($this->user, 2026, 7, 2);

    $response = $this->actingAs($this->admin)->get(route('admin.tithes.index', ['year' => 2026]));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Tithes/Index')
        ->has('tithes', 1)
        ->where('tithes.0.label', 'July 2026')
        ->has('tithes.0.entries', 2)
        // Entries are ordered by profit, largest first.
        ->where('tithes.0.entries.0.source_type', 'order')
        ->where('tithes.0.entries.0.source_id', $larger->id)
        ->where('tithes.0.entries.0.reference', $larger->order_number)
        ->where('tithes.0.entries.0.profit', 1200)
        ->where('tithes.0.entries.0.tithe', 120)
        ->where('tithes.0.entries.1.source_id', $smaller->id)
        ->where('tithes.0.entries.1.reference', $smaller->order_number)
        ->where('tithes.0.entries.1.profit', 600)
        ->where('tithes.0.entries.1.tithe', 60)
        ->where('tithes.0.total_profit', 1800)
        ->where('tithes.0.total_amount', 180)
    );
});

it('keeps a multi-product order as one entry labelled with every product it sold', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'completed',
        'created_at' => '2026-07-10 10:00:00',
    ]);

    $productA = Product::factory()->create(['title' => 'Product A', 'type' => ProductType::Digital]);
    $productB = Product::factory()->create(['title' => 'Product B', 'type' => ProductType::Physical]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->for($productA)->create()->id,
        'price' => 10000,
        'purchase_price' => 2000,
        'quantity' => 1,
    ]);
    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->for($productB)->create()->id,
        'price' => 3500,
        'purchase_price' => 1000,
        'quantity' => 2,
    ]);

    syncTithe(2026, 7);

    // 8,000 from Product A plus 5,000 from Product B was one payment, so it settles once.
    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes.0.entries', 1)
            ->where('tithes.0.entries.0.label', 'Product A, Product B')
            ->where('tithes.0.entries.0.reference', $order->order_number)
            ->where('tithes.0.entries.0.profit', 13000)
            ->where('tithes.0.entries.0.tithe', 1300)
            ->where('tithes.0.total_amount', 1300)
        );
});

it('lists an offline service as its own entry pointing at the engagement', function () {
    $product = Product::factory()->create(['title' => 'Domain Renewal', 'type' => ProductType::Service]);

    $engagement = ServiceEngagement::factory()->offlineTithed()->create([
        'user_id' => $this->user->id,
        'product_id' => $product->id,
        'project_name' => 'ACME domain',
        'invoice_paid_at' => '2026-07-15',
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes.0.entries', 1)
            ->where('tithes.0.entries.0.source_type', 'service')
            ->where('tithes.0.entries.0.source_id', $engagement->id)
            ->where('tithes.0.entries.0.label', 'Domain Renewal')
            ->where('tithes.0.entries.0.reference', 'ACME domain')
            ->where('tithes.0.entries.0.profit', 7960)
            ->where('tithes.0.entries.0.tithe', 796)
        );
});

it('keeps an order and an offline service for the same product as separate entries', function () {
    $product = Product::factory()->create(['title' => 'Domain Renewal', 'type' => ProductType::Service]);

    $order = completedOrderIn(
        $this->user,
        2026,
        7,
        ProductVariant::factory()->for($product)->create(),
        1000,
        400,
    );

    $engagement = ServiceEngagement::factory()->offlineTithed()->create([
        'user_id' => $this->user->id,
        'product_id' => $product->id,
        'invoice_paid_at' => '2026-07-15',
    ]);

    syncTithe(2026, 7);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes.0.entries', 2)
            ->where('tithes.0.entries.0.source_type', 'service')
            ->where('tithes.0.entries.0.source_id', $engagement->id)
            ->where('tithes.0.entries.1.source_type', 'order')
            ->where('tithes.0.entries.1.source_id', $order->id)
        );
});

it('separates the monthly breakdown by month', function () {
    $product = Product::factory()->create(['title' => 'Recurring Product']);
    $variant = ProductVariant::factory()->for($product)->create();

    foreach (['2026-07-10 10:00:00', '2026-08-03 10:00:00'] as $index => $createdAt) {
        $order = Order::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'completed',
            'created_at' => $createdAt,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'price' => 1000,
            'purchase_price' => 500,
            'quantity' => $index + 1,
        ]);
    }

    syncTithe(2026, 7);
    syncTithe(2026, 8);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes', 2)
            ->where('tithes.0.label', 'August 2026')
            ->where('tithes.0.entries.0.profit', 1000)
            ->where('tithes.0.total_amount', 100)
            ->where('tithes.1.label', 'July 2026')
            ->where('tithes.1.entries.0.profit', 500)
            ->where('tithes.1.total_amount', 50)
        );
});

it('tithes service profit on the invoiced grand total rather than the estimate', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'completed',
        'created_at' => '2026-07-10 10:00:00',
    ]);

    $product = Product::factory()->create(['title' => 'Consulting', 'type' => ProductType::Service]);
    $variant = ProductVariant::factory()->for($product)->create();

    $orderItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1000, // Only an estimate; the saved invoice below is what is owed.
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->create([
        'user_id' => $this->user->id,
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'order_item_id' => $orderItem->id,
        'purchase_price_npr' => 1500,
        'tax_rate' => 0,
        'line_items' => [
            ['label' => 'Discovery', 'quantity' => 2, 'unit_price_npr' => 2000],
            ['label' => 'Build', 'quantity' => 1, 'unit_price_npr' => 4500],
        ],
    ]);

    syncTithe(2026, 7);

    // Grand total 8,500 less the 1,500 engagement cost leaves 7,000 profit.
    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.entries.0.label', 'Consulting')
            ->where('tithes.0.entries.0.reference', $order->order_number)
            ->where('tithes.0.entries.0.profit', 7000)
            ->where('tithes.0.total_amount', 700)
        );

    $this->assertDatabaseHas('monthly_tithes', [
        'year' => 2026,
        'month' => 7,
        'total_amount' => 70000,
    ]);
});

it('lists the distinct months that have completed orders, newest first', function () {
    foreach (['2026-07-10 10:00:00', '2026-07-28 10:00:00', '2026-08-03 10:00:00'] as $createdAt) {
        Order::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'completed',
            'created_at' => $createdAt,
        ]);
    }

    Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'created_at' => '2026-09-01 10:00:00',
    ]);

    expect(app(CalculateMonthlyProfitAction::class)->monthsWithCompletedOrders())->toBe([
        ['year' => 2026, 'month' => 8],
        ['year' => 2026, 'month' => 7],
    ]);
});

it('shows only the tithes of the requested year', function () {
    seedTitheFor($this->user, 2026, 7);
    seedTitheFor($this->user, 2027, 3);
    seedTitheFor($this->user, 2027, 4);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2027]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.year', 2027)
            ->has('tithes', 2)
            ->where('tithes.0.label', 'April 2027')
            ->where('tithes.1.label', 'March 2027')
        );
});

it('hides a tithe whose month no longer has any completed-order profit', function () {
    seedTitheFor($this->user, 2026, 7);

    // Stale: a tithe row survives for a month that never earned anything.
    MonthlyTithe::factory()->create(['year' => 2026, 'month' => 3, 'is_paid' => true]);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes', 1)
            ->where('tithes.0.label', 'July 2026')
        );
});

it('lists the years that have tithes, newest first, alongside the current year', function () {
    MonthlyTithe::factory()->create(['year' => 2024, 'month' => 5]);
    MonthlyTithe::factory()->create(['year' => 2027, 'month' => 1]);

    $currentYear = (int) now()->year;

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('years', collect([2027, $currentYear, 2024])->unique()->sortDesc()->values()->all())
        );
});

it('defaults to the current year when no year is requested', function () {
    seedTitheFor($this->user, 2024, 5);
    $currentTithe = seedTitheFor($this->user, (int) now()->year, 2);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.year', (int) now()->year)
            ->has('tithes', 1)
            ->where('tithes.0.id', $currentTithe->id)
        );
});

it('falls back to the current year when an unknown year is requested', function () {
    seedTitheFor($this->user, (int) now()->year, 2);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 1999]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.year', (int) now()->year)
            ->has('tithes', 1)
        );
});

it('allows admins to view and toggle monthly tithes', function () {
    $monthlyTithe = seedTitheFor($this->user, 2026, 7);

    $response = $this->actingAs($this->admin)->get(route('admin.tithes.index', ['year' => 2026]));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Tithes/Index')
        ->has('tithes', 1)
        ->where('tithes.0.id', $monthlyTithe->id)
        ->where('tithes.0.is_paid', false)
    );

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    expect($monthlyTithe->fresh())
        ->is_paid->toBeTrue()
        ->paid_at->not->toBeNull();

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    expect($monthlyTithe->fresh())
        ->is_paid->toBeFalse()
        ->paid_at->toBeNull();
});

it('settles one order without touching another in the same month', function () {
    [$smaller, $larger] = seedOrdersForMonth($this->user, 2026, 7, 2);
    $monthlyTithe = MonthlyTithe::query()->where('year', 2026)->where('month', 7)->sole();

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $smaller->id]))
        ->assertRedirect();

    $this->assertDatabaseHas('monthly_tithe_items', [
        'monthly_tithe_id' => $monthlyTithe->id,
        'order_id' => $smaller->id,
        'is_paid' => true,
    ]);
    $this->assertDatabaseHas('monthly_tithe_items', [
        'monthly_tithe_id' => $monthlyTithe->id,
        'order_id' => $larger->id,
        'is_paid' => false,
    ]);

    expect($monthlyTithe->fresh())
        ->is_paid->toBeFalse()
        ->paid_at->toBeNull();

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.payment_status', 'partial')
            ->where('tithes.0.paid_amount', 60)
            ->where('tithes.0.outstanding_amount', 120)
            ->where('tithes.0.entries.0.source_id', $larger->id)
            ->where('tithes.0.entries.0.is_paid', false)
            ->where('tithes.0.entries.1.source_id', $smaller->id)
            ->where('tithes.0.entries.1.is_paid', true)
        );
});

it('settles two orders of the same product independently', function () {
    $variant = ProductVariant::factory()->create();

    $first = completedOrderIn($this->user, 2026, 7, $variant, 1000, 400);
    $second = completedOrderIn($this->user, 2026, 7, $variant, 2000, 800);
    $monthlyTithe = syncTithe(2026, 7);

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $first->id]))
        ->assertRedirect();

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes.0.entries', 2)
            ->where('tithes.0.entries.0.source_id', $second->id)
            ->where('tithes.0.entries.0.is_paid', false)
            ->where('tithes.0.entries.1.source_id', $first->id)
            ->where('tithes.0.entries.1.is_paid', true)
            ->where('tithes.0.payment_status', 'partial')
        );
});

it('settles an offline service without touching an order in the same month', function () {
    $order = completedOrderIn($this->user, 2026, 7, ProductVariant::factory()->create(), 1000, 400);

    $engagement = ServiceEngagement::factory()->offlineTithed()->create([
        'user_id' => $this->user->id,
        'invoice_paid_at' => '2026-07-15',
    ]);

    $monthlyTithe = syncTithe(2026, 7);

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.services.toggle-status', [$monthlyTithe->id, $engagement->id]))
        ->assertRedirect();

    $this->assertDatabaseHas('monthly_tithe_items', [
        'monthly_tithe_id' => $monthlyTithe->id,
        'service_engagement_id' => $engagement->id,
        'order_id' => null,
        'is_paid' => true,
    ]);
    $this->assertDatabaseHas('monthly_tithe_items', [
        'monthly_tithe_id' => $monthlyTithe->id,
        'order_id' => $order->id,
        'service_engagement_id' => null,
        'is_paid' => false,
    ]);

    expect($monthlyTithe->fresh()->is_paid)->toBeFalse();

    // 796 of the 856 owed is settled; the 60 from the order is still outstanding.
    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.payment_status', 'partial')
            ->where('tithes.0.paid_amount', 796)
            ->where('tithes.0.outstanding_amount', 60)
        );
});

it('settles the month automatically once every entry is paid', function () {
    [$smaller, $larger] = seedOrdersForMonth($this->user, 2026, 7, 2);
    $monthlyTithe = MonthlyTithe::query()->where('year', 2026)->where('month', 7)->sole();

    foreach ([$smaller, $larger] as $order) {
        $this->actingAs($this->admin)
            ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $order->id]))
            ->assertRedirect();
    }

    expect($monthlyTithe->fresh())
        ->is_paid->toBeTrue()
        ->paid_at->not->toBeNull();

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.payment_status', 'paid')
            ->where('tithes.0.paid_amount', 180)
            ->where('tithes.0.outstanding_amount', 0)
        );
});

it('settles every entry when the month is marked paid in bulk', function () {
    [$smaller, $larger] = seedOrdersForMonth($this->user, 2026, 7, 2);
    $monthlyTithe = MonthlyTithe::query()->where('year', 2026)->where('month', 7)->sole();

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    expect($monthlyTithe->fresh()->is_paid)->toBeTrue()
        ->and(MonthlyTitheItem::query()->where('is_paid', true)->pluck('order_id')->sort()->values()->all())
        ->toBe(collect([$smaller->id, $larger->id])->sort()->values()->all());

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    expect($monthlyTithe->fresh())
        ->is_paid->toBeFalse()
        ->paid_at->toBeNull()
        ->and(MonthlyTitheItem::query()->where('is_paid', true)->count())->toBe(0);
});

it('returns the month to unpaid when a single entry is unsettled after a bulk payment', function () {
    [$smaller] = seedOrdersForMonth($this->user, 2026, 7, 2);
    $monthlyTithe = MonthlyTithe::query()->where('year', 2026)->where('month', 7)->sole();

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertRedirect();

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $smaller->id]))
        ->assertRedirect();

    expect($monthlyTithe->fresh()->is_paid)->toBeFalse();

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.payment_status', 'partial')
            ->where('tithes.0.paid_amount', 120)
            ->where('tithes.0.outstanding_amount', 60)
        );
});

it('treats a month settled before entry tracking existed as fully paid', function () {
    [$smaller] = seedOrdersForMonth($this->user, 2026, 7, 2);
    $monthlyTithe = MonthlyTithe::query()->where('year', 2026)->where('month', 7)->sole();

    // Legacy state: the month was settled in bulk, so it carries no entry records.
    $monthlyTithe->update(['is_paid' => true, 'paid_at' => now()]);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.payment_status', 'paid')
            ->where('tithes.0.paid_amount', 180)
        );

    // Unsettling one entry must backfill the rest as paid rather than wipe them.
    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $smaller->id]))
        ->assertRedirect();

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.payment_status', 'partial')
            ->where('tithes.0.paid_amount', 120)
            ->where('tithes.0.outstanding_amount', 60)
        );
});

it('rejects settling an order that earned no profit in the month', function () {
    $monthlyTithe = seedTitheFor($this->user, 2026, 7);
    $unrelatedOrder = Order::factory()->create(['user_id' => $this->user->id, 'status' => 'pending']);

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $unrelatedOrder->id]))
        ->assertNotFound();

    $this->assertDatabaseCount('monthly_tithe_items', 0);
});

it('rejects settling a service that earned no profit in the month', function () {
    $monthlyTithe = seedTitheFor($this->user, 2026, 7);
    $unrelatedEngagement = ServiceEngagement::factory()->create(['user_id' => $this->user->id]);

    $this->actingAs($this->admin)
        ->patch(route('admin.tithes.services.toggle-status', [$monthlyTithe->id, $unrelatedEngagement->id]))
        ->assertNotFound();

    $this->assertDatabaseCount('monthly_tithe_items', 0);
});

it('costs the same number of queries however many months of tithes exist', function () {
    $variant = ProductVariant::factory()->create();

    $seedMonths = function (array $months) use ($variant): void {
        foreach ($months as $month) {
            completedOrderIn($this->user, 2026, (int) $month, $variant, 1000, 400);
            syncTithe(2026, (int) $month);
        }
    };

    $countQueries = function (): int {
        $queries = 0;
        DB::listen(function () use (&$queries): void {
            $queries++;
        });

        $this->actingAs($this->admin)->get(route('admin.tithes.index', ['year' => 2026]))->assertSuccessful();

        return $queries;
    };

    $seedMonths(['01', '02']);
    $twoMonths = $countQueries();

    $seedMonths(['03', '04', '05', '06']);
    $sixMonths = $countQueries();

    expect(MonthlyTithe::count())->toBe(6)
        ->and($sixMonths)->toBe($twoMonths);
});

it('prevents non-admins from accessing tithe management', function () {
    $monthlyTithe = MonthlyTithe::factory()->create();
    $order = Order::factory()->create(['user_id' => $this->user->id]);
    $engagement = ServiceEngagement::factory()->create(['user_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->patch(route('admin.tithes.orders.toggle-status', [$monthlyTithe->id, $order->id]))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->patch(route('admin.tithes.services.toggle-status', [$monthlyTithe->id, $engagement->id]))
        ->assertForbidden();
});

it('shows tithe stats on the admin dashboard', function () {
    MonthlyTithe::factory()->create([
        'month' => 1,
        'year' => 2026,
        'total_amount' => 120.25,
        'is_paid' => true,
        'paid_at' => now(),
    ]);
    MonthlyTithe::factory()->create([
        'month' => 2,
        'year' => 2026,
        'total_amount' => 49.75,
        'is_paid' => false,
        'paid_at' => null,
    ]);

    $response = $this->actingAs($this->admin)->get(route('admin.dashboard'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->where('stats.total_tithes_collected_npr', 120.25)
        ->where('stats.pending_tithes_npr', 49.75)
    );
});

it('reports dashboard tithe stats from the profit of completed orders', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'completed',
        'created_at' => '2026-07-10 10:00:00',
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 10000,
        'purchase_price' => 2000,
        'quantity' => 1,
    ]);

    syncTithe(2026, 7);

    $this->actingAs($this->admin)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_profit_npr', 8000)
            ->where('stats.total_tithes_collected_npr', 0)
            ->where('stats.pending_tithes_npr', 800)
        );
});

it('counts an invoiced service at its grand total in dashboard profit', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'completed',
        'created_at' => '2026-07-10 10:00:00',
    ]);

    $product = Product::factory()->create(['type' => ProductType::Service]);
    $variant = ProductVariant::factory()->for($product)->create();

    $orderItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->create([
        'user_id' => $this->user->id,
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'order_item_id' => $orderItem->id,
        'purchase_price_npr' => 1500,
        'tax_rate' => 0,
        'line_items' => [
            ['label' => 'Build', 'quantity' => 1, 'unit_price_npr' => 8500],
        ],
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_profit_npr', 7000)
        );
});
