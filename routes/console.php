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
Schedule::command('queue:work', ['--stop-when-empty', '--max-time=55'])
    ->everyMinute()
    ->withoutOverlapping(2);
