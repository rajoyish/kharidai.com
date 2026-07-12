<?php

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Enums\ProductType;
use App\Models\MonthlyTithe;
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
 * A tithe only exists off the back of a completed order's profit, so seed the order
 * that earns it and let the sync action derive the row.
 */
function seedTitheFor(User $user, int $year, int $month): MonthlyTithe
{
    $order = Order::factory()->create([
        'user_id' => $user->id,
        'status' => 'completed',
        'created_at' => CarbonImmutable::create($year, $month, 10, 10),
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

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

it('breaks a month down per product, tithing ten percent of each product profit', function () {
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

    app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create(2026, 7, 1));

    $response = $this->actingAs($this->admin)->get(route('admin.tithes.index', ['year' => 2026]));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Tithes/Index')
        ->has('tithes', 1)
        ->where('tithes.0.label', 'July 2026')
        ->has('tithes.0.products', 2)
        ->where('tithes.0.products.0.name', 'Product A')
        ->where('tithes.0.products.0.profit', 8000)
        ->where('tithes.0.products.0.tithe', 800)
        ->where('tithes.0.products.1.name', 'Product B')
        ->where('tithes.0.products.1.profit', 5000)
        ->where('tithes.0.products.1.tithe', 500)
        ->where('tithes.0.total_profit', 13000)
        ->where('tithes.0.total_amount', 1300)
    );
});

it('separates the per-product breakdown by month', function () {
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

    app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create(2026, 7, 1));
    app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create(2026, 8, 1));

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes', 2)
            ->where('tithes.0.label', 'August 2026')
            ->where('tithes.0.products.0.profit', 1000)
            ->where('tithes.0.total_amount', 100)
            ->where('tithes.1.label', 'July 2026')
            ->where('tithes.1.products.0.profit', 500)
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

    app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create(2026, 7, 1));

    // Grand total 8,500 less the 1,500 engagement cost leaves 7,000 profit.
    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tithes.0.products.0.name', 'Consulting')
            ->where('tithes.0.products.0.profit', 7000)
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

it('costs the same number of queries however many months of tithes exist', function () {
    $variant = ProductVariant::factory()->create();

    $seedMonths = function (array $months) use ($variant): void {
        foreach ($months as $month) {
            $order = Order::factory()->create([
                'user_id' => $this->user->id,
                'status' => 'completed',
                'created_at' => "2026-{$month}-10 10:00:00",
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_variant_id' => $variant->id,
                'price' => 1000,
                'purchase_price' => 400,
                'quantity' => 1,
            ]);

            app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create(2026, (int) $month, 1));
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

    $this->actingAs($this->user)
        ->get(route('admin.tithes.index', ['year' => 2026]))
        ->assertForbidden();

    $this->actingAs($this->user)
        ->patch(route('admin.tithes.toggle-status', $monthlyTithe))
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

    app(SyncMonthlyTitheAction::class)->execute(CarbonImmutable::create(2026, 7, 1));

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
