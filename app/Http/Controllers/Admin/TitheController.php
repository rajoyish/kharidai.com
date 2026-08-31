<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Actions\Tithes\SettleTitheAction;
use App\Http\Controllers\Controller;
use App\Models\MonthlyTithe;
use App\Models\MonthlyTitheItem;
use App\Models\Order;
use App\Models\ServiceEngagement;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-type TitheEntry array{source_type: string, source_id: int, label: string, reference: string, profit: float, tithe: float}
 * @phpstan-type SettledEntry array{source_type: string, source_id: int, label: string, reference: string, profit: float, tithe: float, is_paid: bool, paid_at: string|null}
 */
class TitheController extends Controller
{
    public function index(Request $request, CalculateMonthlyProfitAction $calculateMonthlyProfit): Response
    {
        $years = $this->yearsWithTithes();
        $selectedYear = $this->selectedYear($request, $years);
        $search = $request->string('search')->trim()->value();

        $breakdowns = $calculateMonthlyProfit->executeForYear($selectedYear);

        $tithes = MonthlyTithe::query()
            ->with('items')
            ->where('year', $selectedYear)
            ->orderByDesc('month')
            ->get()
            ->map(function (MonthlyTithe $monthlyTithe) use ($breakdowns, $calculateMonthlyProfit): array {
                $key = $calculateMonthlyProfit->monthKey($monthlyTithe->year, $monthlyTithe->month);
                $breakdown = $breakdowns[$key] ?? ['entries' => [], 'total_profit' => 0.0, 'total_tithe' => 0.0];

                $entries = $this->settledEntries($monthlyTithe, $breakdown['entries']);
                $paidAmount = round(array_sum(array_column(array_filter($entries, fn (array $entry): bool => $entry['is_paid']), 'tithe')), 2);

                return [
                    'id' => $monthlyTithe->id,
                    'month' => $monthlyTithe->month,
                    'year' => $monthlyTithe->year,
                    'label' => CarbonImmutable::create($monthlyTithe->year, $monthlyTithe->month, 1)->format('F Y'),
                    'entries' => $entries,
                    'total_profit' => $breakdown['total_profit'],
                    'total_amount' => $breakdown['total_tithe'],
                    'paid_amount' => $paidAmount,
                    'outstanding_amount' => round($breakdown['total_tithe'] - $paidAmount, 2),
                    'payment_status' => $this->paymentStatus($entries),
                    'is_paid' => $monthlyTithe->is_paid,
                    'paid_at' => $monthlyTithe->paid_at?->toIso8601String(),
                ];
            })
            // A month whose completed orders no longer yield profit owes nothing, so it must not
            // surface as an empty zero row an admin can mark "paid". SyncMonthlyTitheAction deletes
            // such months; this guards the page against any that outlive a later data change.
            ->filter(fn (array $tithe): bool => $tithe['total_profit'] > 0)
            // A tithe row is a month plus the records that earned it, and both are
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

    /**
     * Settle, or unsettle, everything in the month at once.
     */
    public function toggleStatus(
        MonthlyTithe $monthlyTithe,
        CalculateMonthlyProfitAction $calculateMonthlyProfit,
        SettleTitheAction $settleTithe,
    ): RedirectResponse {
        $isPaid = ! $monthlyTithe->is_paid;

        $settleTithe->settleMonth($monthlyTithe, $isPaid, $this->entriesFor($calculateMonthlyProfit, $monthlyTithe));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $isPaid
                ? 'Tithe marked as paid.'
                : 'Tithe marked as unpaid.',
        ]);

        return back();
    }

    /**
     * Settle, or unsettle, one completed order's tithe.
     */
    public function toggleOrderStatus(
        MonthlyTithe $monthlyTithe,
        Order $order,
        CalculateMonthlyProfitAction $calculateMonthlyProfit,
        SettleTitheAction $settleTithe,
    ): RedirectResponse {
        return $this->toggleEntry(
            $monthlyTithe,
            CalculateMonthlyProfitAction::SOURCE_ORDER,
            $order->id,
            $order->order_number,
            $calculateMonthlyProfit,
            $settleTithe,
        );
    }

    /**
     * Settle, or unsettle, one offline service engagement's tithe.
     */
    public function toggleServiceStatus(
        MonthlyTithe $monthlyTithe,
        ServiceEngagement $serviceEngagement,
        CalculateMonthlyProfitAction $calculateMonthlyProfit,
        SettleTitheAction $settleTithe,
    ): RedirectResponse {
        return $this->toggleEntry(
            $monthlyTithe,
            CalculateMonthlyProfitAction::SOURCE_SERVICE,
            $serviceEngagement->id,
            $serviceEngagement->project_name ?? 'Service #'.$serviceEngagement->id,
            $calculateMonthlyProfit,
            $settleTithe,
        );
    }

    /**
     * Flip one entry's paid flag. The month's own status follows from its entries.
     */
    private function toggleEntry(
        MonthlyTithe $monthlyTithe,
        string $sourceType,
        int $sourceId,
        string $name,
        CalculateMonthlyProfitAction $calculateMonthlyProfit,
        SettleTitheAction $settleTithe,
    ): RedirectResponse {
        $entries = $this->entriesFor($calculateMonthlyProfit, $monthlyTithe);
        $key = $calculateMonthlyProfit->entryKey($sourceType, $sourceId);

        abort_unless(in_array($key, $this->entryKeys($entries), true), 404);

        $item = $monthlyTithe->items()
            ->where(MonthlyTitheItem::sourceColumns($sourceType, $sourceId))
            ->first();

        // With no settlement record yet the entry inherits the month's flag,
        // matching how the page renders it.
        $isPaid = ! ($item?->is_paid ?? $monthlyTithe->is_paid);

        $settleTithe->settleEntry($monthlyTithe, $sourceType, $sourceId, $isPaid, $entries);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $isPaid
                ? "{$name} tithe marked as paid."
                : "{$name} tithe marked as unpaid.",
        ]);

        return back();
    }

    /**
     * Pair each of the month's earning records with its settlement state.
     *
     * @param  list<TitheEntry>  $entries
     * @return list<SettledEntry>
     */
    private function settledEntries(MonthlyTithe $monthlyTithe, array $entries): array
    {
        $items = $monthlyTithe->items->keyBy(fn (MonthlyTitheItem $item): string => $item->entryKey());

        return array_map(function (array $entry) use ($monthlyTithe, $items): array {
            $item = $items->get($entry['source_type'].':'.$entry['source_id']);

            // A month settled in bulk before entry-level tracking existed carries no
            // settlement records, yet everything in it is paid. Toggling any entry
            // backfills the records, after which the month flag can only be true
            // when they all are.
            $isPaid = $item?->is_paid ?? $monthlyTithe->is_paid;
            $paidAt = $item !== null
                ? $item->paid_at
                : ($monthlyTithe->is_paid ? $monthlyTithe->paid_at : null);

            return [
                ...$entry,
                'is_paid' => $isPaid,
                'paid_at' => $paidAt?->toIso8601String(),
            ];
        }, $entries);
    }

    /**
     * Whether the month is fully settled, partly settled, or untouched.
     *
     * @param  list<SettledEntry>  $entries
     * @return 'paid'|'partial'|'unpaid'
     */
    private function paymentStatus(array $entries): string
    {
        $paidCount = count(array_filter($entries, fn (array $entry): bool => $entry['is_paid']));

        return match (true) {
            $entries !== [] && $paidCount === count($entries) => 'paid',
            $paidCount > 0 => 'partial',
            default => 'unpaid',
        };
    }

    /**
     * Everything that earned profit in the given month.
     *
     * @return list<TitheEntry>
     */
    private function entriesFor(CalculateMonthlyProfitAction $calculateMonthlyProfit, MonthlyTithe $monthlyTithe): array
    {
        return $calculateMonthlyProfit->execute($monthlyTithe->year, $monthlyTithe->month)['entries'];
    }

    /**
     * @param  list<TitheEntry>  $entries
     * @return list<string>
     */
    private function entryKeys(array $entries): array
    {
        return array_map(fn (array $entry): string => $entry['source_type'].':'.$entry['source_id'], $entries);
    }

    /**
     * Match a search term against the month label ("January 2026") or any record
     * that contributed profit to it, by name or by order number.
     *
     * @param  array{label: string, entries: list<SettledEntry>}  $tithe
     */
    private function titheMatchesSearch(array $tithe, string $search): bool
    {
        if (Str::contains($tithe['label'], $search, ignoreCase: true)) {
            return true;
        }

        return collect($tithe['entries'])->contains(
            fn (array $entry): bool => Str::contains($entry['label'], $search, ignoreCase: true)
                || Str::contains($entry['reference'], $search, ignoreCase: true),
        );
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
