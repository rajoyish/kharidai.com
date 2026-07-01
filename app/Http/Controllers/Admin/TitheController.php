<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlyTithe;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TitheController extends Controller
{
    public function index(): Response
    {
        $tithes = MonthlyTithe::query()
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get()
            ->map(function (MonthlyTithe $monthlyTithe): array {
                return [
                    'id' => $monthlyTithe->id,
                    'month' => $monthlyTithe->month,
                    'year' => $monthlyTithe->year,
                    'label' => CarbonImmutable::create($monthlyTithe->year, $monthlyTithe->month, 1)->format('F Y'),
                    'total_amount' => $monthlyTithe->total_amount,
                    'total_profit' => round($monthlyTithe->total_amount * 10, 2),
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
