<?php

namespace App\Actions\Tithes;

use App\Models\MonthlyTithe;
use App\Models\OrderItem;
use Carbon\CarbonInterface;

class SyncMonthlyTitheAction
{
    public function execute(CarbonInterface $date): void
    {
        $month = (int) $date->month;
        $year = (int) $date->year;

        $profitAmountInCents = (int) OrderItem::query()
            ->selectRaw('COALESCE(SUM((order_items.price - order_items.purchase_price) * order_items.quantity), 0) as total_profit_amount')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'completed')
            ->whereYear('orders.created_at', $year)
            ->whereMonth('orders.created_at', $month)
            ->value('total_profit_amount');

        if ($profitAmountInCents <= 0) {
            MonthlyTithe::query()
                ->where('year', $year)
                ->where('month', $month)
                ->delete();

            return;
        }

        MonthlyTithe::query()->updateOrCreate(
            [
                'year' => $year,
                'month' => $month,
            ],
            [
                'total_amount' => round($profitAmountInCents / 1000, 2),
            ],
        );
    }
}
