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
        'project_completion_date',
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
        if (! $serviceEngagement->wasChanged(self::TITHE_RELEVANT_FIELDS)) {
            return;
        }

        $months = [];
        $this->collectMonth($months, $serviceEngagement->offlineTitheDate());

        // A moved completion date leaves the old month holding stale profit, so it
        // must be recomputed too — not just the month the engagement now lands in.
        if ($serviceEngagement->wasChanged('project_completion_date')) {
            $original = $serviceEngagement->getOriginal('project_completion_date');
            $this->collectMonth($months, $original !== null
                ? CarbonImmutable::parse($original)
                : $serviceEngagement->created_at);
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
