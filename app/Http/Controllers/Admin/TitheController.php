<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Http\Controllers\Controller;
use App\Models\MonthlyTithe;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TitheController extends Controller
{
    public function index(CalculateMonthlyProfitAction $calculateMonthlyProfit): Response
    {
        $breakdowns = $calculateMonthlyProfit->executeForAllMonths();

        $tithes = MonthlyTithe::query()
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get()
            ->map(function (MonthlyTithe $monthlyTithe) use ($breakdowns, $calculateMonthlyProfit): array {
                $key = $calculateMonthlyProfit->monthKey($monthlyTithe->year, $monthlyTithe->month);
                $breakdown = $breakdowns[$key] ?? ['products' => [], 'total_profit' => 0.0, 'total_tithe' => 0.0];

                return [
                    'id' => $monthlyTithe->id,
                    'month' => $monthlyTithe->month,
                    'year' => $monthlyTithe->year,
                    'label' => CarbonImmutable::create($monthlyTithe->year, $monthlyTithe->month, 1)->format('F Y'),
                    'products' => $breakdown['products'],
                    'total_profit' => $breakdown['total_profit'],
                    'total_amount' => $breakdown['total_tithe'],
                    'is_paid' => $monthlyTithe->is_paid,
                    'paid_at' => $monthlyTithe->paid_at?->toIso8601String(),
                ];
            })
            ->values();

        return Inertia::render('Admin/Tithes/Index', [
            'tithes' => $tithes,
        ]);
    }

    public function toggleStatus(MonthlyTithe $monthlyTithe): RedirectResponse
    {
        $isPaid = ! $monthlyTithe->is_paid;

        $monthlyTithe->update([
            'is_paid' => $isPaid,
            'paid_at' => $isPaid ? now() : null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $isPaid
                ? 'Tithe marked as paid.'
                : 'Tithe marked as unpaid.',
        ]);

        return back();
    }
}
