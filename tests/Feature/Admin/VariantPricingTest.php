<?php

use App\Enums\PriceSnapshotSource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\VariantPriceSnapshot;
use App\Services\Procurement\WalletLedger;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->product = Product::factory()->create();
    $this->variant = ProductVariant::factory()->for($this->product)->create(['price_npr' => 750, 'purchase_price_npr' => 300]);
    $this->supplier = Supplier::factory()->create();
    $this->ledger = app(WalletLedger::class);
    $this->ledger->recordTopUp($this->supplier, [
        'face_value' => 10,
        'amount_paid' => 12.05,
        'paid_currency' => 'USD',
        'fx_rate' => 131.42,
        'credits_received' => '8.09676294',
        'topped_up_at' => '2026-11-01',
    ]);
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function pricingInput(Supplier $supplier, array $overrides = []): array
{
    return [
        'supplier_id' => $supplier->id,
        'supplier_cost_credits' => '2.04',
        'cost_basis' => 'fifo',
        'profit_mode' => 'amount',
        'target_profit_npr' => 500,
        'rounding' => 'nearest_1',
        ...$overrides,
    ];
}

function quoteUrl(Product $product, ProductVariant $variant): string
{
    return route('admin.products.variants.pricing.quote', [$product, $variant]);
}

it('prices the reference voucher scenario at NPR 899', function () {
    $response = $this->actingAs($this->admin)->postJson(quoteUrl($this->product, $this->variant), pricingInput($this->supplier));

    $response->assertOk()->assertJson([
        'landed_cost_npr' => 398.99,
        'total_cost_npr' => 398.99,
        'selling_price_npr' => 899,
        'profit_npr' => 500.01,
        'warnings' => [],
    ]);
});

it('shows the supplier balance before and after one unit', function () {
    $response = $this->actingAs($this->admin)->postJson(quoteUrl($this->product, $this->variant), pricingInput($this->supplier));

    $response->assertOk()->assertJson([
        'supplier_id' => $this->supplier->id,
        'balance_credits' => '8.09676294',
        'balance_after_credits' => '6.05676294',
    ]);
    expect($this->supplier->topUps()->sole()->credits_remaining)->toBe('8.09676294');
});

it('prices to a target margin and rounds to a price ending in 99', function () {
    $response = $this->actingAs($this->admin)->postJson(quoteUrl($this->product, $this->variant), pricingInput($this->supplier, [
        'profit_mode' => 'margin',
        'target_margin_percent' => 40,
        'rounding' => 'ending_99',
    ]));

    $response->assertOk()->assertJson(['selling_price_npr' => 699, 'profit_npr' => 300.01]);
});

it('compares cost bases when the wallet mixes top-ups bought at different rates', function () {
    $this->ledger->recordTopUp($this->supplier, [
        'face_value' => 20,
        'amount_paid' => 24,
        'paid_currency' => 'USD',
        'fx_rate' => 133,
        'credits_received' => '16',
        'topped_up_at' => '2026-11-10',
    ]);

    $response = $this->actingAs($this->admin)->postJson(quoteUrl($this->product, $this->variant), pricingInput($this->supplier, ['cost_basis' => 'latest']));

    $response->assertOk()->assertJson([
        'landed_cost_npr' => 406.98,
        'bases' => ['fifo' => 398.99, 'average' => 404.3, 'latest' => 406.98],
    ]);
});

it('prices credits beyond the balance at the latest top-up rate and warns', function () {
    $response = $this->actingAs($this->admin)->postJson(quoteUrl($this->product, $this->variant), pricingInput($this->supplier, ['supplier_cost_credits' => '10']));

    $response->assertOk()
        ->assertJsonPath('landed_cost_npr', 1955.86)
        ->assertJsonPath('shortfall_credits', '1.90323706')
        ->assertJsonPath('warnings.0', 'Not enough credits: 1.90323706 short. Top up before buying.');
});

it('prices from a manual rate without a wallet', function () {
    $response = $this->actingAs($this->admin)->postJson(quoteUrl($this->product, $this->variant), pricingInput($this->supplier, [
        'supplier_id' => null,
        'cost_basis' => 'manual',
        'manual_npr_per_credit' => 200,
        'extra_cost_npr' => 20,
    ]));

    $response->assertOk()->assertJson(['landed_cost_npr' => 408, 'total_cost_npr' => 428, 'selling_price_npr' => 928]);
});

it('requires a manual rate when pricing manually', function () {
    $response = $this->actingAs($this->admin)->post(quoteUrl($this->product, $this->variant), pricingInput($this->supplier, ['cost_basis' => 'manual']));

    $response->assertSessionHasErrors(['manual_npr_per_credit' => 'Enter the price of 1 credit in Rs.']);
});

it('applies a calculated price to the variant and snapshots its inputs', function () {
    $response = $this->actingAs($this->admin)->post(
        route('admin.products.variants.pricing.apply', [$this->product, $this->variant]),
        pricingInput($this->supplier, ['update_purchase_price' => true, 'notes' => 'November top-up']),
    );

    $response->assertRedirect()->assertSessionHas('inertia.flash_data.toast', ['type' => 'success', 'message' => 'Price set to Rs. 899.00 (profit Rs. 500.01).']);
    $variant = $this->variant->refresh();
    expect($variant->price_npr)->toBe(899.0)
        ->and($variant->purchase_price_npr)->toBe(398.99)
        ->and($variant->supplier_cost_credits)->toBe('2.04000000')
        ->and($variant->supplier_id)->toBe($this->supplier->id);
    $snapshot = VariantPriceSnapshot::sole();
    expect($snapshot->source)->toBe(PriceSnapshotSource::Calculator)
        ->and($snapshot->selling_price_npr)->toBe(899.0)
        ->and($snapshot->landed_cost_npr)->toBe(398.99)
        ->and($snapshot->target_profit_npr)->toBe(500.0)
        ->and($snapshot->notes)->toBe('November top-up');
});

it('applies an overridden final price and keeps the purchase price when asked', function () {
    $this->actingAs($this->admin)->post(
        route('admin.products.variants.pricing.apply', [$this->product, $this->variant]),
        pricingInput($this->supplier, ['final_price_npr' => 949, 'update_purchase_price' => false]),
    );

    $variant = $this->variant->refresh();
    expect($variant->price_npr)->toBe(949.0)
        ->and($variant->purchase_price_npr)->toBe(300.0);
});

it('records a manual price edit in the history only when a price changed', function () {
    $url = '/admin/products/'.$this->product->slug.'/variants/'.$this->variant->id;

    $this->actingAs($this->admin)->patch($url, ['name' => 'Renamed', 'price_npr' => 750, 'purchase_price_npr' => 300]);
    $this->actingAs($this->admin)->patch($url, ['name' => 'Renamed', 'price_npr' => 999, 'purchase_price_npr' => 300]);

    $snapshot = VariantPriceSnapshot::sole();
    expect($snapshot->source)->toBe(PriceSnapshotSource::Manual)
        ->and($snapshot->selling_price_npr)->toBe(999.0)
        ->and($snapshot->user_id)->toBe($this->admin->id);
});

it('does not price a variant through another product', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.products.variants.pricing.show', [Product::factory()->create(), $this->variant]))
        ->assertNotFound();
});

it('flags cost drift on the pricing page once credits get dearer', function () {
    $this->variant->update(['supplier_id' => $this->supplier->id, 'supplier_cost_credits' => '2.04', 'purchase_price_npr' => 350]);

    $this->actingAs($this->admin)
        ->get(route('admin.products.variants.pricing.show', [$this->product, $this->variant]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/ProductVariants/Pricing')
            ->where('costDrift.current_cost_npr', 398.99)
            ->where('costDrift.recorded_cost_npr', 350));
});

it('never ships supplier credit cost to the storefront', function () {
    $product = Product::factory()->physical()->create();
    ProductVariant::factory()->for($product)->create([
        'supplier_id' => $this->supplier->id,
        'supplier_cost_credits' => '7.13572468',
    ]);

    $html = $this->get(route('products.show', $product))->getContent();

    expect($html)->not->toContain('7.13572468')
        ->and($html)->not->toContain('supplier_cost_credits');
});

it('assigns a supplier and its credit price without touching the selling price', function () {
    $response = $this->actingAs($this->admin)->patch(route('admin.products.variants.supplier.update', [$this->product, $this->variant]), [
        'supplier_id' => $this->supplier->id,
        'supplier_cost_credits' => '2.04',
    ]);

    $response->assertRedirect();
    $variant = $this->variant->refresh();
    expect($variant->supplier_id)->toBe($this->supplier->id)
        ->and($variant->supplier_cost_credits)->toBe('2.04000000')
        ->and($variant->price_npr)->toBe(750.0);
    expect($this->supplier->topUps()->sole()->credits_remaining)->toBe('8.09676294');
});

it('needs a supplier to assign', function () {
    $response = $this->actingAs($this->admin)->patch(route('admin.products.variants.supplier.update', [$this->product, $this->variant]), []);

    $response->assertSessionHasErrors(['supplier_id' => 'Pick a supplier.']);
});
