<?php

use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Models\Category;
use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

/**
 * A digital order, which is the only kind the orders index lists under
 * `digitalOrders`.
 */
function digitalOrderFor(User $user): Order
{
    $order = Order::factory()->create(['user_id' => $user->id]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->for(Product::factory())->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    return $order->fresh();
}

it('filters products by title', function () {
    Product::factory()->create(['title' => 'Netflix Premium']);
    Product::factory()->create(['title' => 'Spotify Family']);

    $this->actingAs($this->admin)
        ->get(route('admin.products.index', ['search' => 'netflix']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products', 1)
            ->where('products.0.title', 'Netflix Premium')
            ->where('filters.search', 'netflix')
            ->etc()
        );
});

it('keeps the type filter while searching products', function () {
    Product::factory()->physical()->create(['title' => 'Netflix Mug']);
    Product::factory()->create(['title' => 'Netflix Premium']);

    $this->actingAs($this->admin)
        ->get(route('admin.products.index', ['search' => 'netflix', 'type' => 'physical']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products', 1)
            ->where('products.0.title', 'Netflix Mug')
            ->etc()
        );
});

it('filters categories by name', function () {
    Category::factory()->create(['name' => 'Streaming']);
    Category::factory()->create(['name' => 'Hosting']);

    $this->actingAs($this->admin)
        ->get(route('admin.categories.index', ['search' => 'stream']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('categories', 1)
            ->where('categories.0.name', 'Streaming')
            ->where('filters.search', 'stream')
            ->etc()
        );
});

it('filters users by name, email, or mobile number', function () {
    User::factory()->create(['name' => 'Sita Rai', 'email' => 'sita@example.com', 'mobile_number' => '9800000001']);
    User::factory()->create(['name' => 'Hari Thapa', 'email' => 'hari@example.com', 'mobile_number' => '9800000002']);

    $listedNames = fn (string $search): array => collect(
        $this->actingAs($this->admin)
            ->get(route('admin.users.index', ['search' => $search]))
            ->assertSuccessful()
            ->inertiaProps('users')
    )->pluck('name')->all();

    expect($listedNames('sita'))->toBe(['Sita Rai'])
        ->and($listedNames('hari@example.com'))->toBe(['Hari Thapa'])
        ->and($listedNames('9800000001'))->toBe(['Sita Rai']);
});

it('filters service engagements by project name', function () {
    ServiceEngagement::factory()->create(['project_name' => 'Bakery Website']);
    ServiceEngagement::factory()->create(['project_name' => 'Gym App']);

    $this->actingAs($this->admin)
        ->get(route('admin.services.index', ['search' => 'bakery']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('engagements', 1)
            ->where('engagements.0.project_name', 'Bakery Website')
            ->where('filters.search', 'bakery')
            ->etc()
        );
});

it('filters orders by order number', function () {
    $user = User::factory()->create();
    $wanted = digitalOrderFor($user);
    digitalOrderFor($user);

    $this->actingAs($this->admin)
        ->get(route('admin.orders.index', ['search' => $wanted->order_number]))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('digitalOrders.data', 1)
            ->where('digitalOrders.data.0.order_number', $wanted->order_number)
            ->etc()
        );
});

it('filters orders by customer', function () {
    digitalOrderFor(User::factory()->create(['name' => 'Sita Rai']));
    digitalOrderFor(User::factory()->create(['name' => 'Hari Thapa']));

    $this->actingAs($this->admin)
        ->get(route('admin.orders.index', ['search' => 'sita']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('digitalOrders.data', 1)
            ->where('digitalOrders.data.0.user.name', 'Sita Rai')
            ->etc()
        );
});

it('searches orders without a query per matched order', function () {
    $user = User::factory()->create(['name' => 'Sita Rai']);

    $countQueries = function (): int {
        $queries = 0;
        DB::listen(function () use (&$queries): void {
            $queries++;
        });

        $this->actingAs($this->admin)
            ->get(route('admin.orders.index', ['search' => 'sita']))
            ->assertSuccessful();

        return $queries;
    };

    digitalOrderFor($user);
    $oneMatch = $countQueries();

    digitalOrderFor($user);
    digitalOrderFor($user);
    $threeMatches = $countQueries();

    // The search is a join-free `whereHas`, so widening the result set must not
    // cost a query per row.
    expect($threeMatches)->toBe($oneMatch);
});

it('filters subscriptions by order number', function () {
    $user = User::factory()->create();
    $wanted = Subscription::factory()->create(['order_id' => Order::factory()->create(['user_id' => $user->id])->id]);
    Subscription::factory()->create(['order_id' => Order::factory()->create(['user_id' => $user->id])->id]);

    $this->actingAs($this->admin)
        ->get(route('admin.subscriptions.index', ['search' => $wanted->order->order_number]))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('subscriptions.data', 1)
            ->where('subscriptions.data.0.id', $wanted->id)
            ->etc()
        );
});

it('filters tithes by month label', function () {
    $user = User::factory()->create();
    $year = (int) CarbonImmutable::now()->year;

    foreach ([1, 2] as $month) {
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
    }

    expect(MonthlyTithe::query()->where('year', $year)->count())->toBe(2);

    $this->actingAs($this->admin)
        ->get(route('admin.tithes.index', ['year' => $year, 'search' => 'january']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tithes', 1)
            ->where('tithes.0.label', "January {$year}")
            ->where('filters.search', 'january')
            ->etc()
        );
});
