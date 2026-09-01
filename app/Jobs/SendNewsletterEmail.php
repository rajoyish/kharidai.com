<?php

namespace App\Jobs;

use App\Mail\NewsletterMail;
use App\Models\NewsletterRecipient;
use App\Services\Mail\EmailQuotaTracker;
use App\Services\Mail\EmailRouter;
use DateTimeInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends one newsletter to one address.
 *
 * One job per recipient rather than one per newsletter: the daily quota can stop
 * a run at any point, and a per-recipient job can be released back onto the queue
 * and resumed tomorrow without re-sending to everyone it already reached. The
 * recipient row's status is what makes that idempotent.
 */
class SendNewsletterEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Unlimited attempts, bounded by retryUntil() and maxExceptions instead.
     *
     * A release is an attempt, and a newsletter that runs into the daily cap
     * releases every remaining job until the window rolls over — an attempt limit
     * would burn through itself waiting rather than failing at anything.
     */
    public int $tries = 0;

    /**
     * Real failures are still capped. Three transport errors and this recipient is
     * marked failed rather than retried against a provider that keeps refusing.
     */
    public int $maxExceptions = 3;

    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public NewsletterRecipient $recipient,
    ) {}

    /**
     * The outer bound on a paused send. Two days covers a newsletter larger than a
     * single day's quota; past that, something is wrong and the job should fail
     * loudly instead of drifting.
     */
    public function retryUntil(): DateTimeInterface
    {
        return now()->addDays(2);
    }

    public function handle(EmailRouter $router, EmailQuotaTracker $tracker): void
    {
        $recipient = $this->recipient->fresh(['newsletter']);

        if ($recipient === null || ! $recipient->isPending()) {
            return;
        }

        $newsletter = $recipient->newsletter;

        if ($newsletter === null) {
            return;
        }

        $mailer = $router->resolveMailer();

        if ($mailer === null) {
            $newsletter->markPaused();
            $this->release($tracker->secondsUntilCapacity());

            return;
        }

        $newsletter->markSending();

        $sent = Mail::mailer($mailer)
            ->to($recipient->email)
            ->send(new NewsletterMail($newsletter));

        /*
         * A null return means the send was cancelled, not delivered — the quota
         * circuit breaker in App\Listeners\EnforceEmailQuota is the only thing that
         * does that, and it can win a race against the check above when a
         * transactional email spends the last of the allowance in between. Put the
         * job back rather than marking a recipient we never mailed as sent.
         */
        if ($sent === null) {
            $newsletter->markPaused();
            $this->release($tracker->secondsUntilCapacity());

            return;
        }

        $recipient->markSent($mailer);
        $newsletter->refreshProgress();
    }

    /**
     * Record the failure against the recipient so the newsletter can close and the
     * admin can see who was missed. Without this a failed address would sit
     * pending forever and the newsletter would never leave "sending".
     */
    public function failed(?Throwable $exception): void
    {
        $recipient = $this->recipient->fresh(['newsletter']);

        if ($recipient === null || ! $recipient->isPending()) {
            return;
        }

        $recipient->markFailed($exception?->getMessage() ?? 'Unknown delivery failure.');
        $recipient->newsletter?->refreshProgress();

        Log::warning('Newsletter delivery failed.', [
            'newsletter_id' => $recipient->newsletter_id,
            'recipient_id' => $recipient->id,
            'exception' => $exception?->getMessage(),
        ]);
    }
}
