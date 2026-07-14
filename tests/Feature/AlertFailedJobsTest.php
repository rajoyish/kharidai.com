<?php

use App\Mail\FailedJobsAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function recordFailedJob(string $note = 'boom'): void
{
    app('queue.failer')->log(
        'database',
        'default',
        // The uuid is not decoration: the failer indexes on it.
        json_encode([
            'uuid' => (string) Str::uuid(),
            'displayName' => 'App\Mail\OrderConfirmation',
        ]),
        new RuntimeException($note),
    );
}

it('stays quiet when nothing has failed', function () {
    Mail::fake();

    $this->artisan('queue:alert-failed')->assertSuccessful();

    Mail::assertNothingSent();
});

it('emails the shop when a job has failed', function () {
    Mail::fake();

    recordFailedJob();

    $this->artisan('queue:alert-failed')->assertSuccessful();

    /*
     * Sent, not queued: the queue is the thing that is broken, so handing the
     * warning to it could park it behind the very failure it reports.
     */
    Mail::assertSent(
        FailedJobsAlert::class,
        fn (FailedJobsAlert $mail) => $mail->hasTo(config('mail.order_notification_address'))
            && $mail->failedCount === 1,
    );

    Mail::assertNothingQueued();
});

it('does not repeat the same alert on an unchanged backlog', function () {
    Mail::fake();

    recordFailedJob();

    $this->artisan('queue:alert-failed')->assertSuccessful();
    $this->artisan('queue:alert-failed')->assertSuccessful();

    // Hourly cron would otherwise turn one broken transport into a daily inbox
    // full of identical warnings.
    Mail::assertSentCount(1);
});

it('alerts again when the backlog grows', function () {
    Mail::fake();

    recordFailedJob();
    $this->artisan('queue:alert-failed')->assertSuccessful();

    // A second failure is new information, not a repeat of the first.
    recordFailedJob('another');
    $this->artisan('queue:alert-failed')->assertSuccessful();

    Mail::assertSentCount(2);
});
