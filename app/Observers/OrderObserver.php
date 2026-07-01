<?php

namespace App\Observers;

use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Models\Order;
use Carbon\CarbonImmutable;

class OrderObserver
{
    public function __construct(
        private readonly SyncMonthlyTitheAction $syncMonthlyTithe,
    ) {}

    public function created(Order $order): void
    {
        if ($order->status !== 'completed' || $order->created_at === null) {
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
}
