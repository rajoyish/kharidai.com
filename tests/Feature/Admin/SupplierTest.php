<?php

use App\Enums\PurchasePlatform;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WalletPurchase;
use App\Models\WalletTopUp;
use App\Services\Procurement\WalletLedger;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->supplier = Supplier::factory()->create();
});

/**
 * The reference voucher: $10 face, bought for $12.05 at NPR 131.42,
 * redeemed for 8.09676294 credits.
 */
function referenceTopUp(Supplier $supplier, array $overrides = []): WalletTopUp
{
    return app(WalletLedger::class)->recordTopUp($supplier, [
        'face_value' => 10,
        'amount_paid' => 12.05,
        'paid_currency' => 'USD',
        'fx_rate' => 131.42,
        'credits_received' => '8.09676294',
        'topped_up_at' => '2026-11-01',
        ...$overrides,
    ]);
}

it('records a top-up as a cost lot priced from what was actually paid', function () {
    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.top-ups.store', $this->supplier), [
        'reference' => 'VCH-1',
        'face_value' => 10,
        'amount_paid' => 12.05,
        'paid_currency' => 'usd',
        'fx_rate' => 131.42,
        'credits_received' => '8.09676294',
        'topped_up_at' => '2026-11-01',
    ]);

    $response->assertRedirect()->assertSessionHas('inertia.flash_data.toast', ['type' => 'success', 'message' => 'Top-up added.']);
    $this->assertDatabaseHas('wallet_top_ups', [
        'supplier_id' => $this->supplier->id,
        'paid_currency' => 'USD',
        'cost_npr' => 158361,
        'cost_remaining_npr' => 158361,
        'credits_received' => 809676294,
        'credits_remaining' => 809676294,
    ]);
    $topUp = WalletTopUp::sole();
    expect(round($topUp->nprPerCredit(), 4))->toBe(195.5856)
        ->and(round($topUp->voucherMarkupPercent('USD'), 2))->toBe(20.5)
        ->and(round($topUp->creditYieldPercent(), 2))->toBe(80.97);
});

it('ignores the exchange rate for a voucher paid for in rupees', function () {
    $this->actingAs($this->admin)->post(route('admin.suppliers.top-ups.store', $this->supplier), [
        'face_value' => 10,
        'amount_paid' => 1650,
        'paid_currency' => 'NPR',
        'fx_rate' => 140,
        'credits_received' => '8.5',
        'topped_up_at' => '2026-11-01',
    ]);

    $this->assertDatabaseHas('wallet_top_ups', ['fx_rate' => 1, 'cost_npr' => 165000]);
});

it('rejects credits with more than eight decimal places', function () {
    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.top-ups.store', $this->supplier), [
        'face_value' => 10,
        'amount_paid' => 12.05,
        'paid_currency' => 'USD',
        'fx_rate' => 131.42,
        'credits_received' => '8.096762941',
        'topped_up_at' => '2026-11-01',
    ]);

    $response->assertSessionHasErrors(['credits_received' => 'Enter a number like 8.09676294 (max 8 decimals).']);
    $this->assertDatabaseCount('wallet_top_ups', 0);
});

it('pays for a purchase from the oldest credits first and carries the rest forward', function () {
    $older = referenceTopUp($this->supplier);
    $newer = referenceTopUp($this->supplier, ['face_value' => 20, 'amount_paid' => 24, 'fx_rate' => 133, 'credits_received' => '16', 'topped_up_at' => '2026-11-10']);
    $variant = ProductVariant::factory()->create();

    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.purchases.store', $this->supplier), [
        'product_variant_id' => $variant->id,
        'quantity' => 4,
        'unit_cost_credits' => '2.04',
        'purchased_at' => '2026-11-12',
    ]);

    $response->assertRedirect()->assertSessionHas('inertia.flash_data.toast', ['type' => 'success', 'message' => 'Purchase added. Cost: Rs. 1,596.23.']);
    expect($older->refresh()->credits_remaining)->toBe('0.00000000')
        ->and($older->cost_remaining_npr)->toBe(0.0)
        ->and($newer->refresh()->credits_remaining)->toBe('15.93676294')
        ->and($newer->cost_remaining_npr)->toBe(3179.38);
    $purchase = WalletPurchase::sole();
    expect($purchase->credits_spent)->toBe('8.16000000')
        ->and($purchase->cost_npr)->toBe(1596.23)
        ->and($purchase->allocations)->toHaveCount(2);
    expect($variant->refresh()->supplier_cost_credits)->toBe('2.04000000')
        ->and($variant->supplier_id)->toBe($this->supplier->id);
});

it('spends the wallet on a personal purchase without a product or a cost change', function () {
    $topUp = referenceTopUp($this->supplier);
    $variant = ProductVariant::factory()->create(['supplier_cost_credits' => '1.50']);

    $this->actingAs($this->admin)->post(route('admin.suppliers.purchases.store', $this->supplier), [
        'is_personal' => true,
        'description' => 'Netflix for me',
        'quantity' => 1,
        'unit_cost_credits' => '2.04',
        'purchased_at' => '2026-11-12',
    ])->assertSessionHas('inertia.flash_data.toast', ['type' => 'success', 'message' => 'Personal purchase added. Cost: Rs. 398.99.']);

    $this->actingAs($this->admin)->post(route('admin.suppliers.purchases.store', $this->supplier), [
        'is_personal' => true,
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'unit_cost_credits' => '2.04',
        'purchased_at' => '2026-11-12',
    ])->assertSessionHasNoErrors();

    expect(WalletPurchase::where('is_personal', true)->count())->toBe(2)
        ->and($topUp->refresh()->credits_remaining)->toBe('4.01676294')
        ->and($variant->refresh()->supplier_cost_credits)->toBe('1.50000000');
});

it('needs a product for a store purchase and a description for a personal one', function () {
    referenceTopUp($this->supplier);
    $input = ['quantity' => 1, 'unit_cost_credits' => '2.04', 'purchased_at' => '2026-11-12'];

    $this->actingAs($this->admin)
        ->post(route('admin.suppliers.purchases.store', $this->supplier), $input)
        ->assertSessionHasErrors('product_variant_id');

    $this->actingAs($this->admin)
        ->post(route('admin.suppliers.purchases.store', $this->supplier), [...$input, 'is_personal' => true])
        ->assertSessionHasErrors(['description' => 'Say what you bought.'])
        ->assertSessionDoesntHaveErrors('product_variant_id');

    $this->assertDatabaseCount('wallet_purchases', 0);
});

it('lets a store purchase set the cost even when a later personal one exists', function () {
    referenceTopUp($this->supplier);
    $variant = ProductVariant::factory()->create();
    $ledger = app(WalletLedger::class);

    $ledger->recordPurchase($this->supplier, ['is_personal' => true, 'product_variant_id' => $variant->id, 'quantity' => 1, 'unit_cost_credits' => '3', 'purchased_at' => '2026-11-20']);
    $ledger->recordPurchase($this->supplier, ['product_variant_id' => $variant->id, 'quantity' => 1, 'unit_cost_credits' => '2.04', 'purchased_at' => '2026-11-12']);

    expect($variant->refresh()->supplier_cost_credits)->toBe('2.04000000');
});

it('refuses a purchase the wallet cannot cover and moves no balance', function () {
    $topUp = referenceTopUp($this->supplier);

    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.purchases.store', $this->supplier), [
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'quantity' => 5,
        'unit_cost_credits' => '2.04',
        'purchased_at' => '2026-11-12',
    ]);

    $response->assertSessionHasErrors(['unit_cost_credits' => 'Not enough credits. You have 8.09676294, need 10.20000000.']);
    expect($topUp->refresh()->credits_remaining)->toBe('8.09676294');
    $this->assertDatabaseCount('wallet_purchases', 0);
});

it('returns a reversed purchase to the lots it came from', function () {
    $topUp = referenceTopUp($this->supplier);
    $purchase = app(WalletLedger::class)->recordPurchase($this->supplier, [
        'description' => 'Google One Pro',
        'quantity' => 1,
        'unit_cost_credits' => '2.04',
        'purchased_at' => '2026-11-12',
    ]);

    $this->actingAs($this->admin)
        ->delete(route('admin.suppliers.purchases.destroy', [$this->supplier, $purchase]))
        ->assertRedirect();

    $this->assertModelMissing($purchase);
    expect($topUp->refresh()->credits_remaining)->toBe('8.09676294')
        ->and($topUp->cost_remaining_npr)->toBe(1583.61);
});

it('locks the amounts of a top-up that purchases have drawn on', function () {
    $topUp = referenceTopUp($this->supplier);
    app(WalletLedger::class)->recordPurchase($this->supplier, [
        'description' => 'Google One Pro',
        'quantity' => 1,
        'unit_cost_credits' => '1',
        'purchased_at' => '2026-11-12',
    ]);

    $this->actingAs($this->admin)->patch(route('admin.suppliers.top-ups.update', [$this->supplier, $topUp]), [
        'reference' => 'Corrected',
        'amount_paid' => 99,
        'topped_up_at' => '2026-11-02',
    ]);
    $this->actingAs($this->admin)
        ->delete(route('admin.suppliers.top-ups.destroy', [$this->supplier, $topUp]))
        ->assertSessionHasErrors('top_up');

    expect($topUp->refresh()->reference)->toBe('Corrected')
        ->and($topUp->amount_paid)->toBe('12.0500');
    $this->assertModelExists($topUp);
});

it('will not delete a supplier with cost history', function () {
    referenceTopUp($this->supplier);

    $this->actingAs($this->admin)
        ->delete(route('admin.suppliers.destroy', $this->supplier))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    $this->assertModelExists($this->supplier);
});

it('does not reach a top-up through another supplier', function () {
    $topUp = referenceTopUp(Supplier::factory()->create());

    $this->actingAs($this->admin)
        ->delete(route('admin.suppliers.top-ups.destroy', [$this->supplier, $topUp]))
        ->assertNotFound();
});

it('keeps suppliers away from non-admins', function () {
    $this->actingAs(User::factory()->create(['is_admin' => false]))
        ->get(route('admin.suppliers.index'))
        ->assertForbidden();
});

it('shows a supplier with its wallet balance and average credit price', function () {
    referenceTopUp($this->supplier);

    $this->actingAs($this->admin)
        ->get(route('admin.suppliers.show', $this->supplier))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Suppliers/Show')
            ->where('supplier.balance_credits', '8.09676294')
            ->where('supplier.average_npr_per_credit', 195.585571)
            ->has('topUps', 1));
});

it('adds a supplier with where to buy and a contact', function () {
    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.store'), [
        'name' => 'Google One Pro Reseller',
        'platform' => 'telegram',
        'contact' => '@googleone_shop',
        'shop_url' => 'https://t.me/googleone_shop_bot',
        'voucher_currency' => 'usd',
    ]);

    $supplier = Supplier::query()->where('name', 'Google One Pro Reseller')->sole();
    $response->assertRedirect(route('admin.suppliers.show', $supplier));
    expect($supplier->platform)->toBe(PurchasePlatform::Telegram)
        ->and($supplier->contact)->toBe('@googleone_shop')
        ->and($supplier->shop_url)->toBe('https://t.me/googleone_shop_bot')
        ->and($supplier->voucher_currency)->toBe('USD');
});

it('stays on the page when a supplier is added inline', function () {
    $this->actingAs($this->admin)
        ->from('/admin/somewhere')
        ->post(route('admin.suppliers.store'), [
            'name' => 'Discord Seller',
            'platform' => 'discord',
            'voucher_currency' => 'USD',
            'stay' => true,
        ])
        ->assertRedirect('/admin/somewhere');
});

it('requires a name and a known platform', function () {
    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.store'), ['platform' => 'fax', 'voucher_currency' => 'USD']);

    $response->assertSessionHasErrors(['name', 'platform']);
    $this->assertDatabaseCount('suppliers', 1);
});

it('deletes a supplier with no history', function () {
    $this->actingAs($this->admin)->delete(route('admin.suppliers.destroy', $this->supplier))->assertRedirect(route('admin.suppliers.index'));

    $this->assertModelMissing($this->supplier);
});

it('only accepts a full web link as the shop link', function () {
    $response = $this->actingAs($this->admin)->post(route('admin.suppliers.store'), [
        'name' => 'Google One Pro Reseller',
        'platform' => 'website',
        'shop_url' => 'javascript:alert(1)',
        'voucher_currency' => 'USD',
    ]);

    $response->assertSessionHasErrors(['shop_url' => 'Enter a link like https://t.me/googleone_shop_bot, @googleone_shop_bot or a website.']);
    $this->assertDatabaseMissing('suppliers', ['name' => 'Google One Pro Reseller']);
});

it('saves a telegram username as a link and picks the platform from it', function () {
    $this->actingAs($this->admin)->post(route('admin.suppliers.store'), [
        'name' => 'Dante Hub Bot',
        'shop_url' => '@DanteHubBot',
        'voucher_currency' => 'USD',
    ]);

    $supplier = Supplier::query()->where('name', 'Dante Hub Bot')->sole();
    expect($supplier->shop_url)->toBe('https://t.me/DanteHubBot')
        ->and($supplier->platform)->toBe(PurchasePlatform::Telegram);
});

it('does not label a supplier whose platform is other', function () {
    $this->supplier->update(['platform' => PurchasePlatform::Other]);

    $this->actingAs($this->admin)
        ->get(route('admin.suppliers.index'))
        ->assertInertia(fn ($page) => $page->where('suppliers.0.platform_label', null));
});

it('totals every wallet by where its money went, per supplier and per month', function () {
    $this->travelTo('2026-11-20');
    $ledger = app(WalletLedger::class);
    $other = Supplier::factory()->create(['name' => 'Zed Credits']);
    referenceTopUp($this->supplier);
    referenceTopUp($other, ['topped_up_at' => '2025-10-01']);
    $ledger->recordPurchase($this->supplier, ['product_variant_id' => ProductVariant::factory()->create()->id, 'quantity' => 1, 'unit_cost_credits' => '2.04', 'purchased_at' => '2026-11-12']);
    $ledger->recordPurchase($this->supplier, ['is_personal' => true, 'description' => 'For me', 'quantity' => 1, 'unit_cost_credits' => '2.04', 'purchased_at' => '2026-10-05']);

    $this->actingAs($this->admin)->get(route('admin.suppliers.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('spend.totals.topped_up_npr', 3167.22)
            ->where('spend.totals.store_npr', 398.99)
            ->where('spend.totals.personal_npr', 399)
            ->where('spend.totals.remaining_npr', 2369.23)
            ->where('spend.suppliers.0.name', $this->supplier->name)
            ->where('spend.suppliers.0.remaining_npr', 785.62)
            ->where('spend.suppliers.1.store_npr', 0)
            ->has('spend.months', 12)
            ->where('spend.months.0.month', '2025-12')
            ->where('spend.months.11', ['month' => '2026-11', 'topped_up_npr' => 1583.61, 'store_npr' => 398.99, 'personal_npr' => 0])
            ->where('spend.months.10.personal_npr', 399),
        );
});
