<?php

use App\Enums\EngagementStatus;
use App\Models\ServiceEngagement;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('lets the customer agree to an invoice, moving it to awaiting payment', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create([
        'user_id' => $this->user->id,
        'agreed_price_npr' => 11000,
    ]);

    $this->actingAs($this->user)
        ->post("/account/services/{$engagement->id}/agree")
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($engagement->refresh()->status)->toBe(EngagementStatus::AwaitingPayment);
});

it('lets the customer agree from final billing too', function () {
    $engagement = ServiceEngagement::factory()->finalBilling()->create([
        'user_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->post("/account/services/{$engagement->id}/agree")
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::AwaitingPayment);
});

it('cannot agree before the invoice gives it an agreed price', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create([
        'user_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->post("/account/services/{$engagement->id}/agree")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($engagement->refresh()->status)->toBe(EngagementStatus::Negotiation);
});

it('cannot agree to another customer\'s invoice', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create([
        'agreed_price_npr' => 11000,
    ]);

    $this->actingAs($this->user)
        ->post("/account/services/{$engagement->id}/agree")
        ->assertForbidden();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::Negotiation);
});
