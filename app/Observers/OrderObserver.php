<?php

namespace App\Observers;

use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Jobs\SendMetaPurchaseEvent;
use App\Models\Order;
use Carbon\CarbonImmutable;

class OrderObserver
{
    public function __construct(
        private readonly SyncMonthlyTitheAction $syncMonthlyTithe,
    ) {}

    public function created(Order $order): void
    {
        if ($order->status !== 'completed') {
            return;
        }

        $this->reportPurchaseToMeta($order);

        if ($order->created_at === null) {
            return;
        }

        $this->syncMonthlyTithe->execute($order->created_at);
    }

    public function updated(Order $order): void
    {
        if (! $order->wasChanged(['status', 'created_at'])) {
            return;
        }

        $currentStatusIsCompleted = $order->status === 'completed';
        $originalStatusWasCompleted = $order->getOriginal('status') === 'completed';

        if (! $currentStatusIsCompleted && ! $originalStatusWasCompleted) {
            return;
        }

        if ($currentStatusIsCompleted && ! $originalStatusWasCompleted) {
            $this->reportPurchaseToMeta($order);
        }

        $affectedMonths = [];

        if ($currentStatusIsCompleted && $order->created_at !== null) {
            $affectedMonths[$order->created_at->format('Y-m')] = $order->created_at;
        }

        $originalCreatedAt = $order->getOriginal('created_at');

        if ($originalStatusWasCompleted && $originalCreatedAt !== null) {
            $originalMonth = CarbonImmutable::parse($originalCreatedAt);
            $affectedMonths[$originalMonth->format('Y-m')] = $originalMonth;
        }

        foreach ($affectedMonths as $affectedMonth) {
            $this->syncMonthlyTithe->execute($affectedMonth);
        }
    }

    public function deleted(Order $order): void
    {
        if ($order->status !== 'completed' || $order->created_at === null) {
            return;
        }

        $this->syncMonthlyTithe->execute($order->created_at);
    }

    /**
     * Report the sale to Meta's Conversions API, after the response has been sent.
     *
     * After-response rather than queued, which keeps Meta's API off the critical
     * path of the admin's request. Cron now drains a Redis queue (see
     * routes/console.php), so switching this to a plain dispatch() would also give
     * it retries — but that is a deliberate follow-up, not a free swap: the test
     * suite runs the sync queue driver, so dispatch() would execute this job inline
     * and the Meta tests would need reworking to keep it off the network.
     *
     * The job no-ops when the API token is unconfigured, so local and test
     * environments send nothing.
     */
    private function reportPurchaseToMeta(Order $order): void
    {
        SendMetaPurchaseEvent::dispatchAfterResponse($order->id);
    }
}
