<?php

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Enums\EngagementStatus;
use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

/**
 * @return array{products: array, total_profit: float, total_tithe: float}
 */
function monthProfit(int $year, int $month): array
{
    return app(CalculateMonthlyProfitAction::class)->execute($year, $month);
}

// Feature 1: manual status override -----------------------------------------

it('overrides an engagement status past the lifecycle guards', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status-override", [
            'status' => EngagementStatus::Completed->value,
        ])
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::Completed);
});

it('the guarded status update still refuses the same illegal jump', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", [
            'status' => EngagementStatus::Completed->value,
        ])
        ->assertRedirect();

    // The guarded funnel leaves In progress untouched; only the override moves it.
    expect($engagement->refresh()->status)->toBe(EngagementStatus::InProgress);
});

it('rejects an unknown override status', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status-override", [
            'status' => 'not_a_status',
        ])
        ->assertSessionHasErrors('status');

    expect($engagement->refresh()->status)->toBe(EngagementStatus::InProgress);
});

// Feature 2: client reassignment --------------------------------------------

it('reassigns an engagement to a different client', function () {
    $original = User::factory()->create();
    $newClient = User::factory()->create();
    $engagement = ServiceEngagement::factory()->create(['user_id' => $original->id]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/client", ['user_id' => $newClient->id])
        ->assertRedirect();

    expect($engagement->refresh()->user_id)->toBe($newClient->id);
});

it('moves any linked order to the reassigned client', function () {
    $original = User::factory()->create();
    $newClient = User::factory()->create();

    $order = Order::factory()->create(['user_id' => $original->id]);
    $item = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);
    $engagement = ServiceEngagement::factory()->create([
        'user_id' => $original->id,
        'order_item_id' => $item->id,
    ]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/client", ['user_id' => $newClient->id])
        ->assertRedirect();

    expect($engagement->refresh()->user_id)->toBe($newClient->id)
        ->and($order->refresh()->user_id)->toBe($newClient->id);
});

// Feature 3: offline profit & tithe -----------------------------------------

it('registers offline profit and its tithe into the monthly tithe once paid', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create([
        'order_item_id' => null,
        'is_paid' => true,
        'project_completion_date' => '2026-07-15',
        'invoice_paid_at' => '2026-07-15',
        'offline_customer_paid_npr' => null,
        'offline_purchase_cost_npr' => null,
    ]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/offline-financials", [
            'offline_customer_paid_npr' => 17000,
            'offline_purchase_cost_npr' => 9040,
        ])
        ->assertRedirect();

    $engagement->refresh();

    // Acceptance: 17,000 paid − 9,040 cost = 7,960 profit, 796 tithe.
    expect($engagement->offlineProfitNpr())->toBe(7960.0)
        ->and($engagement->offlineTitheNpr())->toBe(796.0);

    $breakdown = monthProfit(2026, 7);
    expect($breakdown['total_profit'])->toBe(7960.0)
        ->and($breakdown['total_tithe'])->toBe(796.0);

    // The observer syncs the month so a payable/trackable tithe row exists.
    $tithe = MonthlyTithe::query()->where('year', 2026)->where('month', 7)->sole();
    expect($tithe->total_amount)->toBe(796.0);
});

it('excludes offline profit that has not been marked paid', function () {
    ServiceEngagement::factory()->offlineTithed()->create([
        'is_paid' => false,
        'invoice_paid_at' => '2026-07-15',
    ]);

    expect(monthProfit(2026, 7)['total_profit'])->toBe(0.0);
    expect(MonthlyTithe::query()->where('year', 2026)->where('month', 7)->exists())->toBeFalse();
});

it('excludes offline profit once the engagement is billed through an order', function () {
    $order = Order::factory()->create(['status' => 'pending']);
    $item = OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->offlineTithed()->create([
        'order_item_id' => $item->id,
        'invoice_paid_at' => '2026-07-15',
    ]);

    // Order is not completed and the offline figures no longer count, so nothing
    // is levied — the offline profit is not double-counted alongside the order.
    expect(monthProfit(2026, 7)['total_profit'])->toBe(0.0);
});

it('attributes offline profit to the month the invoice was paid, not the month it was completed', function () {
    ServiceEngagement::factory()->offlineTithed()->create([
        'project_completion_date' => '2026-03-20',
        'invoice_paid_at' => '2026-05-04',
    ]);

    expect(monthProfit(2026, 3)['total_profit'])->toBe(0.0)
        ->and(monthProfit(2026, 5)['total_profit'])->toBe(7960.0);
});

it('leaves an offline engagement out of the tithe until an invoice paid date is recorded', function () {
    $engagement = ServiceEngagement::factory()->offlineTithed()->create([
        'project_completion_date' => '2026-03-20',
        'invoice_paid_at' => null,
    ]);

    expect(monthProfit(2026, 3)['total_profit'])->toBe(0.0)
        ->and(MonthlyTithe::query()->where('year', 2026)->where('month', 3)->exists())->toBeFalse();

    $engagement->update(['invoice_paid_at' => '2026-03-20']);

    expect(monthProfit(2026, 3)['total_profit'])->toBe(7960.0)
        ->and(MonthlyTithe::query()->where('year', 2026)->where('month', 3)->sole()->total_amount)->toBe(796.0);
});

it('registers the tithe for an offline engagement created with its figures already filled in', function () {
    ServiceEngagement::factory()->offlineTithed()->create([
        'invoice_paid_at' => '2026-03-20',
    ]);

    expect(monthProfit(2026, 3)['total_profit'])->toBe(7960.0)
        ->and(MonthlyTithe::query()->where('year', 2026)->where('month', 3)->sole()->total_amount)->toBe(796.0);
});

it('moves the tithe out of the old month when the invoice paid date changes', function () {
    $engagement = ServiceEngagement::factory()->offlineTithed()->create([
        'invoice_paid_at' => '2026-03-20',
    ]);

    expect(MonthlyTithe::query()->where('year', 2026)->where('month', 3)->exists())->toBeTrue();

    $engagement->update(['invoice_paid_at' => '2026-05-04']);

    expect(monthProfit(2026, 3)['total_profit'])->toBe(0.0)
        ->and(monthProfit(2026, 5)['total_profit'])->toBe(7960.0)
        ->and(MonthlyTithe::query()->where('year', 2026)->where('month', 3)->exists())->toBeFalse()
        ->and(MonthlyTithe::query()->where('year', 2026)->where('month', 5)->sole()->total_amount)->toBe(796.0);
});

it('sums completed-order and offline profit within the same month', function () {
    $order = Order::factory()->create([
        'status' => 'completed',
        'created_at' => '2026-07-10 10:00:00',
    ]);
    OrderItem::create([
        'order_id' => $order->id,
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 1000,
        'purchase_price' => 400,
        'quantity' => 1,
    ]);

    ServiceEngagement::factory()->offlineTithed()->create([
        'invoice_paid_at' => '2026-07-15',
    ]);

    $breakdown = monthProfit(2026, 7);

    // 600 order profit + 7,960 offline profit = 8,560 profit, 856 tithe.
    expect($breakdown['total_profit'])->toBe(8560.0)
        ->and($breakdown['total_tithe'])->toBe(856.0);
});

it('clears an offline profit contribution when the figures are removed', function () {
    $engagement = ServiceEngagement::factory()->offlineTithed()->create([
        'invoice_paid_at' => '2026-07-15',
    ]);

    expect(monthProfit(2026, 7)['total_profit'])->toBe(7960.0);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/offline-financials", [
            'offline_customer_paid_npr' => null,
            'offline_purchase_cost_npr' => null,
        ])
        ->assertRedirect();

    expect(monthProfit(2026, 7)['total_profit'])->toBe(0.0);
    expect(MonthlyTithe::query()->where('year', 2026)->where('month', 7)->exists())->toBeFalse();
});
