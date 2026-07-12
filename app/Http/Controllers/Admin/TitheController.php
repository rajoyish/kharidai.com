<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Http\Controllers\Controller;
use App\Models\MonthlyTithe;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TitheController extends Controller
{
    public function index(Request $request, CalculateMonthlyProfitAction $calculateMonthlyProfit): Response
    {
        $years = $this->yearsWithTithes();
        $selectedYear = $this->selectedYear($request, $years);
        $search = $request->string('search')->trim()->value();

        $breakdowns = $calculateMonthlyProfit->executeForYear($selectedYear);

        $tithes = MonthlyTithe::query()
            ->where('year', $selectedYear)
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
            // A month whose completed orders no longer yield profit owes nothing, so it must not
            // surface as an empty zero row an admin can mark "paid". SyncMonthlyTitheAction deletes
            // such months; this guards the page against any that outlive a later data change.
            ->filter(fn (array $tithe): bool => $tithe['total_profit'] > 0)
            // A tithe row is a month plus the products that earned it, and both are
            // computed above rather than stored, so the term is matched here instead
            // of in the query.
            ->filter(fn (array $tithe): bool => $search === '' || $this->titheMatchesSearch($tithe, $search))
            ->values();

        return Inertia::render('Admin/Tithes/Index', [
            'tithes' => $tithes,
            'years' => $years,
            'filters' => [
                'year' => $selectedYear,
                'search' => $search,
            ],
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

    /**
     * Match a search term against the month label ("January 2026") or any product
     * that contributed profit to it.
     *
     * @param  array{label: string, products: array<int, array{name: string}>}  $tithe
     */
    private function titheMatchesSearch(array $tithe, string $search): bool
    {
        if (Str::contains($tithe['label'], $search, ignoreCase: true)) {
            return true;
        }

        return collect($tithe['products'])
            ->contains(fn (array $product): bool => Str::contains($product['name'], $search, ignoreCase: true));
    }

    /**
     * Every year that holds tithe records, newest first. The current year is always
     * offered too, so a year that has not earned anything yet is still selectable.
     *
     * @return list<int>
     */
    private function yearsWithTithes(): array
    {
        $years = MonthlyTithe::query()
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->map(fn (mixed $year): int => (int) $year)
            ->push((int) CarbonImmutable::now()->year)
            ->unique()
            ->sortDesc()
            ->all();

        return array_values($years);
    }

    /**
     * @param  list<int>  $years
     */
    private function selectedYear(Request $request, array $years): int
    {
        $requestedYear = $request->integer('year');

        return in_array($requestedYear, $years, true)
            ? $requestedYear
            : (int) CarbonImmutable::now()->year;
    }
}
