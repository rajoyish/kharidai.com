<?php

namespace App\Jobs;

use App\Enums\NewsletterRecipientStatus;
use App\Models\Newsletter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Fans a queued newsletter out into one send job per pending recipient.
 *
 * This is a job rather than a loop in the controller because the list can be
 * thousands of rows: dispatching them in the request would hold the admin's
 * browser open for the whole push, and on shared hosting that is the request that
 * gets killed halfway through. Rows are walked with chunkById so memory stays
 * flat however long the list gets.
 */
class QueueNewsletterRecipients implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public Newsletter $newsletter,
    ) {}

    public function handle(): void
    {
        $this->newsletter->recipients()
            ->where('status', NewsletterRecipientStatus::Pending)
            ->select(['id', 'newsletter_id', 'user_id', 'email', 'status'])
            ->chunkById(500, function ($recipients): void {
                foreach ($recipients as $recipient) {
                    SendNewsletterEmail::dispatch($recipient)->onQueue('newsletter');
                }
            });
    }
}
