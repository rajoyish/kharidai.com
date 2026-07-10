<?php

namespace App\Actions\Tithes;

use App\Models\MonthlyTithe;
use Carbon\CarbonInterface;

class SyncMonthlyTitheAction
{
    public function __construct(
        private readonly CalculateMonthlyProfitAction $calculateMonthlyProfit,
    ) {}

    public function execute(CarbonInterface $date): void
    {
        $month = (int) $date->month;
        $year = (int) $date->year;

        $breakdown = $this->calculateMonthlyProfit->execute($year, $month);

        // A month that made no profit owes no tithe, so it should not linger as a
        // zero row an admin can mark "paid".
        if ($breakdown['total_profit'] <= 0) {
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
                'total_amount' => $breakdown['total_tithe'],
            ],
        );
    }
}
