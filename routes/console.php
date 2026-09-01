<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Queue Worker
|--------------------------------------------------------------------------
|
| Shared hosting gives us no long-running process to keep a queue daemon
| alive, so cron drains the queue instead: every minute this starts a worker
| that processes whatever is waiting and exits.
|
| --stop-when-empty  : exit as soon as the queue drains, so an idle site burns
|                      no CPU rather than holding a process open for a minute.
| --max-time=55      : cap a busy run just under the next cron tick, so a run
|                      never overruns into the one after it.
| --queue=…          : order is priority. Newsletter jobs are the long tail of
|                      any run, so `default` is drained first and an order
|                      confirmation never waits behind a mass mail.
| withoutOverlapping : two workers must not run at once — the 2-minute lock
|                      expiry means a worker killed by the host (rather than
|                      exiting cleanly) blocks the queue for one tick, not
|                      forever.
|
| A job therefore leaves the queue within roughly a minute of being pushed.
| That is well inside the tolerance for notifying the shop of an order, and it
| buys us retries, which sending inline would not.
|
*/
Schedule::command('queue:work', ['--stop-when-empty', '--max-time=55', '--queue=default,newsletter'])
    ->everyMinute()
    ->withoutOverlapping(2);

/*
| A failed job is silent: it sits in failed_jobs and waits for someone to look,
| and nobody looks. Hourly is often enough to catch a broken mail transport the
| same day without turning the inbox into a monitoring feed.
*/
Schedule::command('queue:alert-failed')
    ->hourly()
    ->withoutOverlapping(2);

/*
| The send-quota ledger only enforces anything for 24 hours, but every email the
| shop sends leaves a row in it. Pruning keeps the rolling count a scan over a
| week rather than over the site's whole history.
*/
Schedule::command('mail:prune-dispatches')
    ->dailyAt('03:10')
    ->withoutOverlapping(5);
