<?php

namespace App\Services\Procurement;

use App\Models\Supplier;
use App\Models\WalletPurchase;
use App\Models\WalletTopUp;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Where the money put into supplier wallets has gone, across every supplier.
 *
 * Every rupee topped up is in exactly one place: spent on store stock, spent
 * on a personal purchase, or still sitting in a wallet. The ledger expenses
 * each lot for exactly what it cost, so those three always add back up to the
 * total topped up, with nothing lost to rounding. Sums are taken in paisa and
 * converted to rupees once, at the end.
 *
 * @phpstan-type SupplierSpend array{id: int, name: string, topped_up_npr: float, store_npr: float, personal_npr: float, remaining_npr: float, top_up_count: int, purchase_count: int, personal_count: int}
 * @phpstan-type MonthSpend array{month: string, topped_up_npr: float, store_npr: float, personal_npr: float}
 * @phpstan-type SpendTotals array{topped_up_npr: float, store_npr: float, personal_npr: float, remaining_npr: float, top_up_count: int, purchase_count: int, personal_count: int}
 */
class WalletSpendReport
{
    /**
     * How many calendar months the monthly view covers, this one included.
     */
    public const MONTHS = 12;

    /**
     * @return array{totals: SpendTotals, suppliers: list<SupplierSpend>, months: list<MonthSpend>}
     */
    public function build(?CarbonImmutable $now = null): array
    {
        $suppliers = $this->bySupplier();

        return [
            'totals' => $this->totals($suppliers),
            'suppliers' => $suppliers,
            'months' => $this->byMonth(($now ?? CarbonImmutable::now())->startOfMonth()),
        ];
    }

    /**
     * Each supplier that has ever been topped up, the largest first.
     *
     * @return list<SupplierSpend>
     */
    private function bySupplier(): array
    {
        $topUps = WalletTopUp::query()
            ->toBase()
            ->selectRaw('supplier_id, COUNT(*) as top_up_count, SUM(cost_npr) as topped_up, SUM(cost_remaining_npr) as remaining')
            ->groupBy('supplier_id')
            ->get()
            ->keyBy('supplier_id');

        $purchases = WalletPurchase::query()
            ->toBase()
            ->selectRaw('supplier_id, is_personal, COUNT(*) as purchase_count, SUM(cost_npr) as spent')
            ->groupBy('supplier_id', 'is_personal')
            ->get()
            ->groupBy('supplier_id');

        return Supplier::query()
            ->whereIn('id', $topUps->keys())
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function (Supplier $supplier) use ($topUps, $purchases): array {
                $lots = $topUps->get($supplier->id);
                $spends = $purchases->get($supplier->id, collect());
                $personal = $spends->first(fn (object $row): bool => (bool) $row->is_personal);
                $store = $spends->first(fn (object $row): bool => ! $row->is_personal);

                return [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'topped_up_npr' => $this->rupees($lots->topped_up),
                    'store_npr' => $this->rupees($store?->spent),
                    'personal_npr' => $this->rupees($personal?->spent),
                    'remaining_npr' => $this->rupees($lots->remaining),
                    'top_up_count' => (int) $lots->top_up_count,
                    'purchase_count' => (int) ($store?->purchase_count ?? 0),
                    'personal_count' => (int) ($personal?->purchase_count ?? 0),
                ];
            })
            ->sortByDesc('topped_up_npr')
            ->values()
            ->all();
    }

    /**
     * @param  list<SupplierSpend>  $suppliers
     * @return SpendTotals
     */
    private function totals(array $suppliers): array
    {
        $rows = collect($suppliers);

        return [
            'topped_up_npr' => round($rows->sum('topped_up_npr'), 2),
            'store_npr' => round($rows->sum('store_npr'), 2),
            'personal_npr' => round($rows->sum('personal_npr'), 2),
            'remaining_npr' => round($rows->sum('remaining_npr'), 2),
            'top_up_count' => (int) $rows->sum('top_up_count'),
            'purchase_count' => (int) $rows->sum('purchase_count'),
            'personal_count' => (int) $rows->sum('personal_count'),
        ];
    }

    /**
     * Money in and out for each of the last twelve months, oldest first, with
     * quiet months kept as zeros so the timeline has no gaps. Grouped in PHP
     * because month extraction differs between MySQL and the SQLite test
     * database; a year of top-ups and purchases is a small set.
     *
     * @return list<MonthSpend>
     */
    private function byMonth(CarbonImmutable $thisMonth): array
    {
        $from = $thisMonth->subMonths(self::MONTHS - 1);

        $topUps = $this->paisaByMonth(
            WalletTopUp::query()->toBase()->where('topped_up_at', '>=', $from)->get(['topped_up_at as at', 'cost_npr']),
        );

        $purchases = WalletPurchase::query()
            ->toBase()
            ->where('purchased_at', '>=', $from)
            ->get(['purchased_at as at', 'cost_npr', 'is_personal']);

        $store = $this->paisaByMonth($purchases->reject(fn (object $row): bool => (bool) $row->is_personal));
        $personal = $this->paisaByMonth($purchases->filter(fn (object $row): bool => (bool) $row->is_personal));

        return collect(range(0, self::MONTHS - 1))
            ->map(function (int $offset) use ($from, $topUps, $store, $personal): array {
                $month = $from->addMonths($offset)->format('Y-m');

                return [
                    'month' => $month,
                    'topped_up_npr' => $this->rupees($topUps->get($month)),
                    'store_npr' => $this->rupees($store->get($month)),
                    'personal_npr' => $this->rupees($personal->get($month)),
                ];
            })
            ->all();
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return Collection<string, int>
     */
    private function paisaByMonth(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn (object $row): string => CarbonImmutable::parse($row->at)->format('Y-m'))
            ->map(fn (Collection $group): int => (int) $group->sum('cost_npr'));
    }

    private function rupees(int|string|null $paisa): float
    {
        return ((int) $paisa) / 100;
    }
}
