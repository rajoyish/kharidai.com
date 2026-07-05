<?php

namespace App\Services\Engagements;

use App\Enums\EngagementStatus;
use App\Exceptions\InvalidEngagementTransitionException;
use App\Models\ServiceDetail;
use App\Models\ServiceEngagement;

/**
 * Standardizes the service order lifecycle across every service type. The legal
 * edges live on {@see EngagementStatus::allowedTransitions()}; this class layers
 * the business guards on top (signed contract, paid advance, recorded cost,
 * agreed price) and performs the persisted transition.
 */
class EngagementStateMachine
{
    /**
     * The state a fresh engagement starts in, based on the service's gates.
     */
    public function initialStatusFor(ServiceDetail $detail): EngagementStatus
    {
        return match (true) {
            $detail->requires_contract => EngagementStatus::PendingContract,
            $detail->requires_advance => EngagementStatus::AwaitingAdvance,
            default => EngagementStatus::InProgress,
        };
    }

    /**
     * The state that follows a signed contract: the advance gate when an advance
     * is owed, otherwise straight into the work.
     */
    public function afterContractStatus(ServiceEngagement $engagement): EngagementStatus
    {
        return $engagement->advance_required_npr > 0
            ? EngagementStatus::AwaitingAdvance
            : EngagementStatus::InProgress;
    }

    public function canTransition(ServiceEngagement $engagement, EngagementStatus $to): bool
    {
        return $engagement->status->canTransitionTo($to)
            && $this->guardPasses($engagement, $to);
    }

    /**
     * @throws InvalidEngagementTransitionException
     */
    public function transition(ServiceEngagement $engagement, EngagementStatus $to): void
    {
        if (! $this->canTransition($engagement, $to)) {
            throw InvalidEngagementTransitionException::between($engagement->status, $to);
        }

        $engagement->update(['status' => $to]);
    }

    /**
     * Business pre-conditions that must hold before entering a state.
     */
    private function guardPasses(ServiceEngagement $engagement, EngagementStatus $to): bool
    {
        return match ($to) {
            EngagementStatus::Cancelled => true,
            EngagementStatus::AwaitingAdvance => $engagement->contract_signed_at !== null,
            EngagementStatus::InProgress => $this->readyForWork($engagement),
            EngagementStatus::Negotiation => $engagement->calculated_cost_npr > 0,
            EngagementStatus::FinalBilling => $engagement->agreed_price_npr !== null,
            EngagementStatus::Completed => $engagement->agreed_price_npr !== null,
            EngagementStatus::PendingContract => false,
        };
    }

    /**
     * Work may only begin once the mandatory gates for the engagement are met:
     * a signed contract (when required) and a fully paid advance (when owed).
     */
    private function readyForWork(ServiceEngagement $engagement): bool
    {
        if ($engagement->status === EngagementStatus::PendingContract) {
            return $engagement->contract_signed_at !== null
                && $engagement->advance_required_npr <= 0;
        }

        if ($engagement->status === EngagementStatus::AwaitingAdvance) {
            return $engagement->advance_paid_at !== null
                && $engagement->advance_paid_npr >= $engagement->advance_required_npr;
        }

        return false;
    }
}
