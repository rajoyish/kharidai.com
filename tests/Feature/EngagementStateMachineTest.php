<?php

use App\Enums\EngagementStatus;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Models\ServiceDetail;
use App\Models\ServiceEngagement;
use App\Services\Engagements\EngagementStateMachine;

beforeEach(function () {
    $this->machine = app(EngagementStateMachine::class);
});

it('derives the initial status from the service gates', function () {
    $open = ServiceDetail::factory()->create();
    $contract = ServiceDetail::factory()->requiringContract()->create();
    $advance = ServiceDetail::factory()->requiringAdvance()->create();

    expect($this->machine->initialStatusFor($open))->toBe(EngagementStatus::InProgress)
        ->and($this->machine->initialStatusFor($contract))->toBe(EngagementStatus::PendingContract)
        ->and($this->machine->initialStatusFor($advance))->toBe(EngagementStatus::AwaitingAdvance);
});

it('walks an ungated engagement through calculation, negotiation and billing', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create([
        'pricing_config' => ['hourly_rate_npr' => 1500],
    ]);

    $engagement->recordMeasurement($this->machine, ['hours' => 8]);
    expect($engagement->status)->toBe(EngagementStatus::Negotiation)
        ->and($engagement->calculated_cost_npr)->toBe(12000.0);

    $engagement->agreeOnPrice($this->machine, 11000);
    expect($engagement->status)->toBe(EngagementStatus::FinalBilling)
        ->and($engagement->agreed_price_npr)->toBe(11000.0)
        ->and($engagement->outstandingNpr())->toBe(11000.0);

    $this->machine->transition($engagement, EngagementStatus::Completed);
    expect($engagement->status)->toBe(EngagementStatus::Completed);
});

it('blocks work until the contract is signed', function () {
    $engagement = ServiceEngagement::factory()->pendingContract()->create();

    expect($this->machine->canTransition($engagement, EngagementStatus::InProgress))->toBeFalse()
        ->and($this->machine->canTransition($engagement, EngagementStatus::AwaitingAdvance))->toBeFalse();

    $engagement->signContract($this->machine);

    // An advance is still owed, so signing lands on the advance gate, not work.
    expect($engagement->status)->toBe(EngagementStatus::AwaitingAdvance);
});

it('blocks work until the advance is paid in full', function () {
    $engagement = ServiceEngagement::factory()->awaitingAdvance()->create([
        'advance_required_npr' => 20000,
    ]);

    expect($this->machine->canTransition($engagement, EngagementStatus::InProgress))->toBeFalse();

    // Underpaying the advance keeps the gate closed.
    expect(fn () => $engagement->recordAdvance($this->machine, 5000))
        ->toThrow(InvalidEngagementTransitionException::class);

    $engagement->refresh()->recordAdvance($this->machine, 20000);
    expect($engagement->status)->toBe(EngagementStatus::InProgress);
});

it('gates awaiting payment and completion on an agreed price', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create();

    expect($this->machine->canTransition($engagement, EngagementStatus::AwaitingPayment))->toBeFalse()
        ->and($this->machine->canTransition($engagement, EngagementStatus::Completed))->toBeFalse();

    $engagement->update(['agreed_price_npr' => 11000]);

    expect($this->machine->canTransition($engagement, EngagementStatus::AwaitingPayment))->toBeTrue()
        ->and($this->machine->canTransition($engagement, EngagementStatus::Completed))->toBeTrue();
});

it('walks awaiting payment through to completion', function () {
    $engagement = ServiceEngagement::factory()->finalBilling()->create();

    $this->machine->transition($engagement, EngagementStatus::AwaitingPayment);
    expect($engagement->status)->toBe(EngagementStatus::AwaitingPayment);

    $this->machine->transition($engagement, EngagementStatus::Completed);
    expect($engagement->status)->toBe(EngagementStatus::Completed);
});

it('rejects an illegal jump to completed', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    expect(fn () => $this->machine->transition($engagement, EngagementStatus::Completed))
        ->toThrow(InvalidEngagementTransitionException::class);
});

it('cannot open negotiation without a recorded cost', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create(['calculated_cost_npr' => 0]);

    expect($this->machine->canTransition($engagement, EngagementStatus::Negotiation))->toBeFalse();
});
