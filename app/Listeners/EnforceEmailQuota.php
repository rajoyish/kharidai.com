<?php

namespace App\Listeners;

use App\Services\Mail\EmailQuotaTracker;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Log;

/**
 * The fail-safe: once the rolling window has spent every free-tier send, nothing
 * else leaves the application.
 *
 * The newsletter jobs already check their quota before sending and release
 * themselves when it is gone, so in normal operation this never fires. It exists
 * for the sends that do not go through them — an order confirmation queued
 * seconds before the cap, a console command, anything added later — because
 * overrunning a free tier costs the account, not just the message.
 *
 * Returning false from a MessageSending listener cancels the send.
 */
class EnforceEmailQuota
{
    public function __construct(
        private readonly EmailQuotaTracker $tracker,
    ) {}

    public function handle(MessageSending $event): ?bool
    {
        if ($this->tracker->hasCapacity()) {
            return null;
        }

        Log::warning('Email blocked: the rolling send quota is exhausted.', [
            'subject' => $event->message->getSubject(),
            'window_hours' => $this->tracker->windowHours(),
            'limit' => $this->tracker->totalLimit(),
        ]);

        return false;
    }
}
