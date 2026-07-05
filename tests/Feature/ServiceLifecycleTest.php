<?php

use App\Enums\EngagementStatus;
use App\Enums\PricingStrategy;
use App\Models\ServiceEngagement;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

function webDevEngagement(): ServiceEngagement
{
    return ServiceEngagement::factory()->pendingContract()->create([
        'pricing_strategy' => PricingStrategy::Hybrid,
        'pricing_config' => [
            'hourly_rate_npr' => 3000,
            'tiers' => [['key' => 'basic', 'label' => 'Basic', 'price_npr' => 40000]],
        ],
        'advance_required_npr' => 20000,
    ]);
}

it('drives a web development engagement through the full gated lifecycle', function () {
    $engagement = webDevEngagement();

    // Work cannot start (and cost cannot be recorded) before the contract is signed.
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/measurement", ['mode' => 'hourly', 'hours' => 5])
        ->assertRedirect();
    expect($engagement->refresh()->status)->toBe(EngagementStatus::PendingContract)
        ->and($engagement->calculated_cost_npr)->toBe(0.0);

    // Sign the contract -> advance gate (an advance is owed).
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/contract")
        ->assertRedirect();
    expect($engagement->refresh()->status)->toBe(EngagementStatus::AwaitingAdvance);

    // Underpaying the advance keeps the gate closed.
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/advance", ['amount_npr' => 5000])
        ->assertRedirect();
    expect($engagement->refresh()->status)->toBe(EngagementStatus::AwaitingAdvance);

    // Paying the full advance opens the work.
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/advance", ['amount_npr' => 20000])
        ->assertRedirect();
    expect($engagement->refresh()->status)->toBe(EngagementStatus::InProgress);

    // Post-completion measurement computes the cost and opens negotiation.
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/measurement", [
            'mode' => 'tiered',
            'tier_key' => 'basic',
            'extra_hours' => 2,
        ])->assertRedirect();
    $engagement->refresh();
    expect($engagement->status)->toBe(EngagementStatus::Negotiation)
        ->and($engagement->calculated_cost_npr)->toBe(46000.0); // 40000 tier + 2 * 3000

    // Negotiate the final price -> final billing.
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/negotiate", ['agreed_price_npr' => 44000])
        ->assertRedirect();
    $engagement->refresh();
    expect($engagement->status)->toBe(EngagementStatus::FinalBilling)
        ->and($engagement->agreed_price_npr)->toBe(44000.0)
        ->and($engagement->outstandingNpr())->toBe(24000.0); // 44000 - 20000 advance

    // Complete.
    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/complete")
        ->assertRedirect();
    expect($engagement->refresh()->status)->toBe(EngagementStatus::Completed);
});

it('prices a per-page book layout engagement after completion', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create([
        'pricing_strategy' => PricingStrategy::PerPage,
        'pricing_config' => ['cover_rate_npr' => 800, 'inner_rate_npr' => 100],
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/measurement", [
            'cover_pages' => 1,
            'inner_pages' => 120,
        ])->assertRedirect();

    $engagement->refresh();
    expect($engagement->status)->toBe(EngagementStatus::Negotiation)
        ->and($engagement->calculated_cost_npr)->toBe(12800.0); // 800 + 120 * 100
});

it('validates the measurement against the engagement pricing strategy', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create([
        'pricing_strategy' => PricingStrategy::PerPage,
        'pricing_config' => ['cover_rate_npr' => 800, 'inner_rate_npr' => 100],
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/measurement", ['hours' => 5])
        ->assertSessionHasErrors(['cover_pages', 'inner_pages']);
});
