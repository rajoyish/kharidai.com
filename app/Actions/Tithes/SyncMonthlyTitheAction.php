<?php

namespace App\Actions\Tithes;

use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonInterface;

class SyncMonthlyTitheAction
{
    public function execute(CarbonInterface $date): void
    {
        $month = (int) $date->month;
        $year = (int) $date->year;

        $ordersTable = (new Order)->getTable();
        $orderItemsTable = (new OrderItem)->getTable();

        $profitAmountInCents = (int) OrderItem::query()
            ->selectRaw("COALESCE(SUM(({$orderItemsTable}.price - {$orderItemsTable}.purchase_price) * {$orderItemsTable}.quantity), 0) as total_profit_amount")
            ->join($ordersTable, "{$ordersTable}.id", '=', "{$orderItemsTable}.order_id")
            ->where("{$ordersTable}.status", 'completed')
            ->whereYear("{$ordersTable}.created_at", $year)
            ->whereMonth("{$ordersTable}.created_at", $month)
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
