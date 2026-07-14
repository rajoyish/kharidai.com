<?php

namespace App\Console\Commands;

use App\Mail\FailedJobsAlert;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * Emails the shop when jobs are failing.
 *
 * A failed job is silent by design: it lands in the failed_jobs table and waits,
 * and nobody reads that table. The realistic way that bites is the customer mail
 * provider hitting its daily cap — sends start failing, customers quietly stop
 * hearing from us, and the first hint is a confused customer days later.
 *
 * The alert deliberately goes out on the shop's own mailer rather than the
 * customer one: the thing most likely to be broken is the customer transport, so
 * reporting its failure through it would report nothing at all.
 */
#[Signature('queue:alert-failed')]
#[Description('Email the shop if any queued jobs have failed, so a broken mail transport cannot go unnoticed.')]
class AlertFailedJobs extends Command
{
    /**
     * Remembers the count we last alerted on, so a standing backlog does not send
     * the same warning every hour. A *growing* backlog is new information and does
     * alert again; an unchanged one is not.
     */
    private const CACHE_KEY = 'queue.failed.alerted-count';

    public function handle(): int
    {
        $failed = count(app('queue.failer')->all());

        if ($failed === 0) {
            Cache::forget(self::CACHE_KEY);
            $this->info('No failed jobs.');

            return self::SUCCESS;
        }

        $alreadyAlerted = (int) Cache::get(self::CACHE_KEY, 0);

        if ($failed <= $alreadyAlerted) {
            $this->line("{$failed} failed job(s), already alerted. Staying quiet.");

            return self::SUCCESS;
        }

        $shopInbox = config('mail.order_notification_address');

        if (blank($shopInbox)) {
            $this->error("{$failed} failed job(s), but MAIL_ORDER_NOTIFICATION_ADDRESS is not set — cannot alert.");

            return self::FAILURE;
        }

        /*
         * sendNow, not queue. The queue is the thing being reported on, so handing
         * this warning to it could park the warning behind the very failure it
         * describes. It also goes out on the shop's mailer, not the customer one:
         * the customer transport is the likeliest thing to be broken.
         */
        Mail::mailer(config('mail.shop_mailer'))
            ->to($shopInbox)
            ->sendNow(new FailedJobsAlert($failed));

        Cache::put(self::CACHE_KEY, $failed, now()->addDay());

        $this->warn("{$failed} failed job(s). Alerted {$shopInbox}.");

        return self::SUCCESS;
    }
}
