<?php

namespace App\Actions\Tithes;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ServiceEngagement;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

/**
 * Breaks a calendar month's profit down per product, and levies the tithe on that
 * profit. Two sources contribute: completed orders (revenue minus cost of goods)
 * and offline service engagements that record their profit manually because they
 * never pass through an order. Revenue never enters into it: a product only owes a
 * tithe on what it actually earned after its cost.
 *
 * @phpstan-type ProductBreakdown array{product_id: int, name: string, type: string, profit: float, tithe: float}
 * @phpstan-type MonthBreakdown array{products: list<ProductBreakdown>, total_profit: float, total_tithe: float}
 * @phpstan-type ProfitRow array{product_id: int, name: string, type: string, profit: float}
 */
class CalculateMonthlyProfitAction
{
    /**
     * The share of profit owed as tithe.
     */
    public const TITHE_RATE = 0.10;

    /**
     * @return MonthBreakdown
     */
    public function execute(int $year, int $month): array
    {
        $orderRows = $this->orderProfitRows(
            $this->completedItemsQuery()
                ->whereHas('order', fn (Builder $query) => $query
                    ->whereYear('created_at', $year)
                    ->whereMonth('created_at', $month),
                )
                ->get(),
        );

        $offlineRows = $this->offlineProfitRows(
            $this->offlineEngagements()->filter(
                fn (ServiceEngagement $engagement): bool => $this->fallsIn($engagement, $year, $month),
            ),
        );

        return $this->breakdown($orderRows->merge($offlineRows));
    }

    /**
     * Every month of the given year that earned profit, keyed "year-month" and
     * newest first. One pass over the year's order items and offline engagements
     * serves every month in it, so the tithes page costs the same handful of
     * queries whether the year holds one month or twelve.
     *
     * @return array<string, MonthBreakdown>
     */
    public function executeForYear(int $year): array
    {
        $orderRowsByMonth = $this->completedItemsQuery()
            ->whereHas('order', fn (Builder $query) => $query->whereYear('created_at', $year))
            ->get()
            ->groupBy(fn (OrderItem $item): string => $this->monthKeyFor($item->order->created_at))
            ->map(fn (Collection $items): SupportCollection => $this->orderProfitRows($items));

        $offlineRowsByMonth = $this->offlineEngagements()
            ->filter(fn (ServiceEngagement $engagement): bool => (int) $engagement->offlineTitheDate()?->year === $year)
            ->groupBy(fn (ServiceEngagement $engagement): string => $this->monthKeyFor($engagement->offlineTitheDate()))
            ->map(fn (Collection $engagements): SupportCollection => $this->offlineProfitRows($engagements));

        $breakdowns = $orderRowsByMonth->keys()
            ->merge($offlineRowsByMonth->keys())
            ->unique()
            ->mapWithKeys(fn (string $key): array => [
                $key => $this->breakdown(
                    collect($orderRowsByMonth->get($key, collect()))
                        ->merge($offlineRowsByMonth->get($key, collect())),
                ),
            ])
            ->all();

        krsort($breakdowns);

        return $breakdowns;
    }

    /**
     * The key `executeForYear()` files a given year and month under.
     */
    public function monthKey(int $year, int $month): string
    {
        return sprintf('%04d-%02d', $year, $month);
    }

    /**
     * Every year/month pairing that has at least one completed order, newest first.
     *
     * @return list<array{year: int, month: int}>
     */
    public function monthsWithCompletedOrders(): array
    {
        $months = Order::query()
            ->where('status', 'completed')
            ->whereNotNull('created_at')
            ->orderByDesc('created_at')
            ->pluck('created_at')
            ->map(fn (CarbonInterface $createdAt): array => [
                'year' => (int) $createdAt->year,
                'month' => (int) $createdAt->month,
            ])
            ->unique(fn (array $month): string => $this->monthKey($month['year'], $month['month']))
            ->all();

        return array_values($months);
    }

    /**
     * Aggregate per-product profit rows from every source into the month's
     * breakdown, summing the rows that share a product and levying the tithe.
     *
     * @param  SupportCollection<int, ProfitRow>  $rows
     * @return MonthBreakdown
     */
    private function breakdown(SupportCollection $rows): array
    {
        $products = $rows
            ->groupBy('product_id')
            ->map(function (SupportCollection $group): array {
                /** @var ProfitRow $first */
                $first = $group->first();
                $profit = round($group->sum('profit'), 2);

                return [
                    'product_id' => $first['product_id'],
                    'name' => $first['name'],
                    'type' => $first['type'],
                    'profit' => $profit,
                    'tithe' => round($profit * self::TITHE_RATE, 2),
                ];
            })
            ->values()
            ->all();

        usort($products, fn (array $a, array $b): int => $b['profit'] <=> $a['profit']);

        return [
            'products' => $products,
            'total_profit' => round(array_sum(array_column($products, 'profit')), 2),
            'total_tithe' => round(array_sum(array_column($products, 'tithe')), 2),
        ];
    }

    /**
     * One profit row per product across the given completed-order items.
     *
     * @param  Collection<int, OrderItem>  $items
     * @return SupportCollection<int, ProfitRow>
     */
    private function orderProfitRows(Collection $items): SupportCollection
    {
        return $items
            ->groupBy('productVariant.product_id')
            ->map(fn (Collection $productItems): array => $this->orderProfitRow($productItems))
            ->values()
            // Grouping an Eloquent collection yields another Eloquent collection,
            // whose merge() expects models; drop to a plain collection of arrays.
            ->toBase();
    }

    /**
     * The profit row for one product's completed-order items.
     *
     * @param  Collection<int, OrderItem>  $productItems
     * @return ProfitRow
     */
    private function orderProfitRow(Collection $productItems): array
    {
        $product = $productItems->firstOrFail()->productVariant->product;

        return [
            'product_id' => $product->id,
            'name' => $product->title,
            'type' => $product->type->value,
            'profit' => round($productItems->sum(fn (OrderItem $item): float => $item->profitNpr()), 2),
        ];
    }

    /**
     * One profit row per product across the given offline engagements.
     *
     * @param  Collection<int, ServiceEngagement>  $engagements
     * @return SupportCollection<int, ProfitRow>
     */
    private function offlineProfitRows(Collection $engagements): SupportCollection
    {
        return $engagements
            ->groupBy('product_id')
            ->map(fn (Collection $group): array => $this->offlineProfitRow($group))
            ->values()
            ->toBase();
    }

    /**
     * The profit row for one product's offline engagements.
     *
     * @param  Collection<int, ServiceEngagement>  $group
     * @return ProfitRow
     */
    private function offlineProfitRow(Collection $group): array
    {
        $product = $group->firstOrFail()->product;

        return [
            'product_id' => $product->id,
            'name' => $product->title,
            'type' => $product->type->value,
            'profit' => round($group->sum(fn (ServiceEngagement $engagement): float => $engagement->offlineProfitNpr()), 2),
        ];
    }

    /**
     * Every engagement that tracks its profit offline. Loaded whole because the
     * tithe month is derived from a coalesced date (completion date, else created
     * date) that no single indexed column can be filtered on across drivers; the
     * set is small since offline tracking is a deliberate, manual exception.
     *
     * @return Collection<int, ServiceEngagement>
     */
    private function offlineEngagements(): Collection
    {
        return ServiceEngagement::query()
            ->offlineTithed()
            ->with('product:id,title,type')
            ->get();
    }

    /**
     * Whether an offline engagement's tithe date lands in the given year/month.
     */
    private function fallsIn(ServiceEngagement $engagement, int $year, int $month): bool
    {
        $date = $engagement->offlineTitheDate();

        return $date !== null
            && (int) $date->year === $year
            && (int) $date->month === $month;
    }

    /**
     * @return EloquentBuilder<OrderItem>
     */
    private function completedItemsQuery(): EloquentBuilder
    {
        return OrderItem::query()
            ->whereHas('order', fn (Builder $query) => $query
                ->where('status', 'completed')
                ->whereNotNull('created_at'),
            )
            ->with(['order:id,status,created_at', 'serviceEngagements', 'productVariant.product']);
    }

    private function monthKeyFor(CarbonInterface $createdAt): string
    {
        return $this->monthKey((int) $createdAt->year, (int) $createdAt->month);
    }
}
