<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('repairs grouped subscriptions and lists each purchased unit separately', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $order = Order::factory()->create([
        'user_id' => $user->id,
        'status' => 'completed',
    ]);
    $startDate = today();
    $monthlyVariant = ProductVariant::factory()->create();
    $annualVariant = ProductVariant::factory()->create();

    // This repair migration ran in July 2026, when validity was counted in days;
    // rebuild that column so it runs against the schema it was written for.
    Schema::table('product_variants', function (Blueprint $table) {
        $table->unsignedInteger('validity_days')->nullable();
    });
    DB::table('product_variants')->where('id', $monthlyVariant->id)->update(['validity_days' => 30]);
    DB::table('product_variants')->where('id', $annualVariant->id)->update(['validity_days' => 365]);

    $monthlyItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $monthlyVariant->id,
        'price' => 1200,
        'purchase_price' => 800,
        'quantity' => 5,
    ]);
    $annualItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $annualVariant->id,
        'price' => 1800,
        'purchase_price' => 1200,
        'quantity' => 1,
    ]);

    Subscription::query()->create([
        'user_id' => $user->id,
        'order_id' => $order->id,
        'order_item_id' => $monthlyItem->id,
        'start_date' => $startDate->toDateString(),
        'end_date' => $startDate->copy()->addDays(150)->toDateString(),
        'user_label' => 'Team Access',
    ]);
    Subscription::query()->create([
        'user_id' => $user->id,
        'order_id' => $order->id,
        'order_item_id' => $annualItem->id,
        'start_date' => $startDate->toDateString(),
        'end_date' => $startDate->copy()->addDays(365)->toDateString(),
    ]);

    $migration = require database_path('migrations/2026_07_02_113501_drop_unique_index_from_subscriptions_order_item_id.php');
    $migration->up();

    $monthlySubscriptions = Subscription::query()
        ->where('order_item_id', $monthlyItem->id)
        ->orderBy('id')
        ->get();
    $annualSubscriptions = Subscription::query()
        ->where('order_item_id', $annualItem->id)
        ->orderBy('id')
        ->get();

    expect($monthlySubscriptions)->toHaveCount(5);
    expect($annualSubscriptions)->toHaveCount(1);
    expect($monthlySubscriptions->pluck('end_date')->map->toDateString()->unique()->all())
        ->toBe([$startDate->copy()->addDays(30)->toDateString()]);
    expect($monthlySubscriptions->pluck('days_left')->unique()->all())->toBe([30]);
    expect($monthlySubscriptions->pluck('user_label')->filter()->values()->all())->toBe(['Team Access']);
    $this->assertDatabaseCount('subscriptions', 6);

    $this->actingAs($user)
        ->get(route('subscriptions.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Subscriptions/Index')
            ->has('subscriptions', 6)
        );

    $this->actingAs($admin)
        ->get(route('admin.subscriptions.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Subscriptions/Index')
            ->has('subscriptions.data', 6)
        );
});

it('computes and serializes days left when the database has no days_left column', function () {
    Notification::fake();

    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $order = Order::factory()->create([
        'user_id' => $user->id,
        'status' => 'pending',
    ]);
    $variant = ProductVariant::factory()->create([
        'validity_months' => 1,
    ]);
    $item = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'price' => 1200,
        'purchase_price' => 800,
        'quantity' => 1,
    ]);

    if (Schema::hasColumn('subscriptions', 'days_left')) {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('days_left');
        });
    }

    $this->actingAs($admin)
        ->patch('/admin/orders/'.$order->uuid.'/status', ['status' => 'completed'])
        ->assertRedirect();

    $subscription = Subscription::query()
        ->where('order_item_id', $item->id)
        ->firstOrFail();

    $daysInFirstMonth = (int) today()->diffInDays(today()->addMonthsNoOverflow(1));
    expect($subscription->days_left)->toBe($daysInFirstMonth);

    $this->actingAs($user)
        ->get(route('subscriptions.index'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Subscriptions/Index')
            ->has('subscriptions', 1)
            ->where('subscriptions.0.days_left', $daysInFirstMonth)
        );
});

it('creates one subscription per purchased unit without duplicating them on repeat completion', function () {
    Notification::fake();

    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $order = Order::factory()->create([
        'user_id' => $user->id,
        'status' => 'pending',
    ]);
    $startDate = today();
    $monthlyVariant = ProductVariant::factory()->create([
        'validity_months' => 1,
    ]);
    $annualVariant = ProductVariant::factory()->create([
        'validity_months' => 12,
    ]);
    $monthlyItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $monthlyVariant->id,
        'price' => 1200,
        'purchase_price' => 800,
        'quantity' => 5,
    ]);
    $annualItem = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => $annualVariant->id,
        'price' => 1800,
        'purchase_price' => 1200,
        'quantity' => 1,
    ]);

    $this->actingAs($admin)
        ->patch('/admin/orders/'.$order->uuid.'/status', ['status' => 'completed'])
        ->assertRedirect();
    $this->actingAs($admin)
        ->patch('/admin/orders/'.$order->uuid.'/status', ['status' => 'delivering'])
        ->assertRedirect();
    $this->actingAs($admin)
        ->patch('/admin/orders/'.$order->uuid.'/status', ['status' => 'completed'])
        ->assertRedirect();

    $monthlySubscriptions = Subscription::query()
        ->where('order_item_id', $monthlyItem->id)
        ->orderBy('id')
        ->get();
    $annualSubscriptions = Subscription::query()
        ->where('order_item_id', $annualItem->id)
        ->orderBy('id')
        ->get();

    expect($monthlySubscriptions)->toHaveCount(5);
    expect($annualSubscriptions)->toHaveCount(1);
    $monthlyEnd = $startDate->copy()->addMonthsNoOverflow(1);
    $annualEnd = $startDate->copy()->addMonthsNoOverflow(12);
    expect($monthlySubscriptions->pluck('end_date')->map->toDateString()->unique()->all())
        ->toBe([$monthlyEnd->toDateString()]);
    expect($annualSubscriptions->pluck('end_date')->map->toDateString()->unique()->all())
        ->toBe([$annualEnd->toDateString()]);
    expect($monthlySubscriptions->pluck('days_left')->unique()->all())->toBe([(int) $startDate->diffInDays($monthlyEnd)]);
    expect($annualSubscriptions->pluck('days_left')->unique()->all())->toBe([(int) $startDate->diffInDays($annualEnd)]);
    $this->assertDatabaseCount('subscriptions', 6);
});
