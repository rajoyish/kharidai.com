<?php

namespace App\Observers;

use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Models\ServiceEngagement;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class ServiceEngagementObserver
{
    /**
     * Fields whose change can add, remove, or move an engagement's offline profit
     * within the Monthly Tithe, so a save that touches any of them must re-sync the
     * affected month(s).
     *
     * @var list<string>
     */
    private const TITHE_RELEVANT_FIELDS = [
        'offline_customer_paid_npr',
        'offline_purchase_cost_npr',
        'is_paid',
        'invoice_paid_at',
        'order_item_id',
        'product_id',
    ];

    public function __construct(
        private readonly SyncMonthlyTitheAction $syncMonthlyTithe,
    ) {}

    /**
     * Handle the ServiceEngagement "saved" event.
     */
    public function saved(ServiceEngagement $serviceEngagement): void
    {
        // An insert reports no changed attributes — the row did not change, it came
        // into being — so a freshly created engagement must be synced on its own
        // merit. Without this an engagement created with its offline figures already
        // filled in would keep its profit out of the tithe until some later edit.
        if (! $serviceEngagement->wasRecentlyCreated && ! $serviceEngagement->wasChanged(self::TITHE_RELEVANT_FIELDS)) {
            return;
        }

        $months = [];
        $this->collectMonth($months, $serviceEngagement->offlineTitheDate());

        // A moved settlement date leaves the old month holding stale profit, so it
        // must be recomputed too — not just the month the engagement now lands in.
        if ($serviceEngagement->wasChanged('invoice_paid_at')) {
            $original = $serviceEngagement->getOriginal('invoice_paid_at');

            if ($original !== null) {
                $this->collectMonth($months, CarbonImmutable::parse($original));
            }
        }

        $this->syncMonths($months);
    }

    /**
     * Handle the ServiceEngagement "deleted" event.
     */
    public function deleted(ServiceEngagement $serviceEngagement): void
    {
        $months = [];
        $this->collectMonth($months, $serviceEngagement->offlineTitheDate());

        $this->syncMonths($months);
    }

    /**
     * @param  array<string, CarbonInterface>  $months
     */
    private function collectMonth(array &$months, ?CarbonInterface $date): void
    {
        if ($date !== null) {
            $months[$date->format('Y-m')] = $date;
        }
    }

    /**
     * @param  array<string, CarbonInterface>  $months
     */
    private function syncMonths(array $months): void
    {
        foreach ($months as $month) {
            $this->syncMonthlyTithe->execute($month);
        }
    }
}
