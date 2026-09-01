<?php

namespace App\Console\Commands;

use App\Services\Mail\EmailQuotaTracker;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Trims the send-quota ledger.
 *
 * Only the last 24 hours enforces anything; everything older is kept briefly so
 * the admin dashboard is still readable after a bad day, then dropped. Left
 * unpruned the table grows by every email the shop ever sends, and the rolling
 * count is a scan over all of it.
 */
#[Signature('mail:prune-dispatches')]
#[Description('Delete email dispatch records that have aged out of the quota retention window.')]
class PruneEmailDispatches extends Command
{
    public function handle(EmailQuotaTracker $tracker): int
    {
        $deleted = $tracker->prune();

        $this->info("Pruned {$deleted} email dispatch record(s).");

        return self::SUCCESS;
    }
}
