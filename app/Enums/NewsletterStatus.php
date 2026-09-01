<?php

namespace App\Enums;

enum NewsletterStatus: string
{
    case Draft = 'draft';
    case Queued = 'queued';
    case Sending = 'sending';
    case Paused = 'paused';
    case Sent = 'sent';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Queued => 'Queued',
            self::Sending => 'Sending',
            self::Paused => 'Paused (quota reached)',
            self::Sent => 'Sent',
        };
    }

    /**
     * A draft is the only state whose content can still change. Once recipients
     * exist, editing the body would rewrite mail that has already gone out.
     */
    public function isEditable(): bool
    {
        return $this === self::Draft;
    }

    /**
     * Whether queued work is outstanding. A paused newsletter counts: its jobs are
     * released back onto the queue, not abandoned.
     */
    public function isInFlight(): bool
    {
        return match ($this) {
            self::Queued, self::Sending, self::Paused => true,
            self::Draft, self::Sent => false,
        };
    }
}
