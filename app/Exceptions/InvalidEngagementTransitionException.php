<?php

namespace App\Exceptions;

use App\Enums\EngagementStatus;
use RuntimeException;

class InvalidEngagementTransitionException extends RuntimeException
{
    public static function between(EngagementStatus $from, EngagementStatus $to): self
    {
        return new self(sprintf(
            'Cannot move a service engagement from "%s" to "%s".',
            $from->value,
            $to->value,
        ));
    }
}
