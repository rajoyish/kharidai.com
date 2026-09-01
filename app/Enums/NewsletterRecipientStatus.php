<?php

namespace App\Enums;

enum NewsletterRecipientStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';

    /**
     * Withheld on purpose. The address turned out to be app-owned or an admin's
     * by the time the job ran, which is not a delivery failure.
     */
    case Skipped = 'skipped';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Sent => 'Sent',
            self::Failed => 'Failed',
            self::Skipped => 'Skipped',
        };
    }
}
