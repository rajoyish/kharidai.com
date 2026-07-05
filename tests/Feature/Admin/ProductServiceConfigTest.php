<?php

use App\Enums\AdvanceType;
use App\Enums\PricingStrategy;
use App\Models\Product;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('persists per-page pricing config when creating a service product', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Book Layout',
        'pricing_strategy' => 'per_page',
        'pricing_config' => ['cover_rate_npr' => 800, 'inner_rate_npr' => 100],
        'requires_brief' => true,
        'requires_contract' => false,
        'requires_advance' => false,
    ])->assertRedirect();

    $detail = Product::where('title', 'Book Layout')->firstOrFail()->serviceDetail;

    expect($detail)->not->toBeNull()
        ->and($detail->pricing_strategy)->toBe(PricingStrategy::PerPage)
        ->and($detail->pricing_config)->toBe(['cover_rate_npr' => 800, 'inner_rate_npr' => 100]);
});

it('persists the contract and advance gates for web development', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Web Development',
        'pricing_strategy' => 'hybrid',
        'pricing_config' => [
            'hourly_rate_npr' => 3000,
            'tiers' => [['key' => 'basic', 'label' => 'Basic', 'price_npr' => 40000]],
        ],
        'requires_contract' => true,
        'requires_advance' => true,
        'advance_type' => 'fixed',
        'advance_value' => 20000,
    ])->assertRedirect();

    $detail = Product::where('title', 'Web Development')->firstOrFail()->serviceDetail;

    expect($detail->requires_contract)->toBeTrue()
        ->and($detail->requires_advance)->toBeTrue()
        ->and($detail->advance_type)->toBe(AdvanceType::Fixed)
        ->and($detail->advance_value)->toBe(20000);
});

it('creates a default orderable variant for a new service so it can be added to the cart', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Logo Design',
        'pricing_strategy' => 'per_hour',
        'pricing_config' => ['hourly_rate_npr' => 500],
        'requires_brief' => true,
    ])->assertRedirect();

    $service = Product::where('title', 'Logo Design')->firstOrFail();

    expect($service->variants()->count())->toBe(1);
    expect((float) $service->variants()->first()->price_npr)->toBe(0.0);
});

it('does not add a second default variant on update', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Logo Design',
        'pricing_strategy' => 'per_hour',
        'pricing_config' => ['hourly_rate_npr' => 500],
    ])->assertRedirect();

    $service = Product::where('title', 'Logo Design')->firstOrFail();

    $this->actingAs($this->admin)->patch('/admin/products/'.$service->slug, [
        'type' => 'service',
        'title' => 'Logo Design',
        'pricing_strategy' => 'per_hour',
        'pricing_config' => ['hourly_rate_npr' => 700],
    ])->assertRedirect();

    expect($service->variants()->count())->toBe(1);
});

it('validates the pricing config against the selected strategy', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Broken Service',
        'pricing_strategy' => 'per_page',
        'pricing_config' => ['cover_rate_npr' => 800], // inner_rate_npr missing
    ])->assertSessionHasErrors('pricing_config.inner_rate_npr');
});

it('requires advance details when an advance is required', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'type' => 'service',
        'title' => 'Missing Advance',
        'pricing_strategy' => 'per_hour',
        'pricing_config' => ['hourly_rate_npr' => 1500],
        'requires_advance' => true,
    ])->assertSessionHasErrors(['advance_type', 'advance_value']);
});
