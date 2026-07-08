<?php

use App\Enums\PricingStrategy;
use App\Models\Product;
use App\Models\ServiceDetail;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('hydrates the saved pricing strategy when editing a service', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $service = Product::factory()->service()->create();
    ServiceDetail::factory()->create([
        'product_id' => $service->id,
        'pricing_strategy' => PricingStrategy::PerPage,
        'pricing_config' => ['cover_rate_npr' => 500, 'inner_rate_npr' => 200],
    ]);

    $this->actingAs($admin)
        ->get(route('admin.products.edit', $service))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Products/Edit')
            ->where('product.service_detail.pricing_strategy', 'per_page')
            ->where('product.service_detail.pricing_config.cover_rate_npr', 500)
        );
});

it('hides a service variant price from the storefront starting price until opted in', function () {
    $service = Product::factory()->service()->create();
    $variant = $service->variants()->create([
        'name' => 'Standard',
        'price_npr' => 5000,
        'purchase_price_npr' => 0,
        'show_pricing' => false,
    ]);

    // Hidden: the aggregated starting price excludes this variant.
    $this->get('/services')
        ->assertInertia(fn (Assert $page) => $page
            ->where('uncategorizedProducts.0.starting_price_cents', null)
        );

    $variant->update(['show_pricing' => true]);

    // Opted in: the price now drives the starting price (stored in paisa).
    $this->get('/services')
        ->assertInertia(fn (Assert $page) => $page
            ->where('uncategorizedProducts.0.starting_price_cents', 500000)
        );
});
