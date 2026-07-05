<?php

namespace App\Enums;

use App\Services\Engagements\EngagementStateMachine;

enum EngagementStatus: string
{
    case PendingContract = 'pending_contract';
    case AwaitingAdvance = 'awaiting_advance';
    case InProgress = 'in_progress';
    case Negotiation = 'negotiation';
    case FinalBilling = 'final_billing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PendingContract => 'Pending contract',
            self::AwaitingAdvance => 'Awaiting advance',
            self::InProgress => 'In progress',
            self::Negotiation => 'Negotiation',
            self::FinalBilling => 'Final billing',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * States the engagement may move to next. Guards in
     * {@see EngagementStateMachine} enforce the
     * pre-conditions (signed contract, paid advance, recorded cost, etc.).
     *
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::PendingContract => [self::AwaitingAdvance, self::InProgress, self::Cancelled],
            self::AwaitingAdvance => [self::InProgress, self::Cancelled],
            self::InProgress => [self::Negotiation, self::Cancelled],
            self::Negotiation => [self::FinalBilling, self::Cancelled],
            self::FinalBilling => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $status): bool
    {
        return in_array($status, $this->allowedTransitions(), true);
    }

    /**
     * Terminal states no longer participate in the lifecycle.
     */
    public function isTerminal(): bool
    {
        return match ($this) {
            self::Completed, self::Cancelled => true,
            default => false,
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $status): string => $status->value, self::cases());
    }
}
