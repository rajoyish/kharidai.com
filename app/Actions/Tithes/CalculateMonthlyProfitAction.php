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
 * Breaks a calendar month's profit down into the individual records that earned
 * it, and levies the tithe on each. Two sources contribute: completed orders
 * (revenue minus cost of goods) and offline service engagements that record their
 * profit manually because they never pass through an order. Revenue never enters
 * into it: a record only owes a tithe on what it actually earned after its cost.
 *
 * One entry is one settleable thing. A completed order is one entry however many
 * line items it holds, because it was one payment. An offline engagement is one
 * entry of its own. Nothing is merged across records, so settling one entry can
 * never move another.
 *
 * @phpstan-type TitheEntry array{source_type: string, source_id: int, label: string, reference: string, profit: float, tithe: float}
 * @phpstan-type MonthBreakdown array{entries: list<TitheEntry>, total_profit: float, total_tithe: float}
 */
class CalculateMonthlyProfitAction
{
    /**
     * The share of profit owed as tithe.
     */
    public const TITHE_RATE = 0.10;

    /**
     * Entries earned by a completed order.
     */
    public const SOURCE_ORDER = 'order';

    /**
     * Entries earned by an offline service engagement.
     */
    public const SOURCE_SERVICE = 'service';

    /**
     * @return MonthBreakdown
     */
    public function execute(int $year, int $month): array
    {
        $orderEntries = $this->orderEntries(
            $this->completedItemsQuery()
                ->whereHas('order', fn (Builder $query) => $query
                    ->whereYear('created_at', $year)
                    ->whereMonth('created_at', $month),
                )
                ->get(),
        );

        $offlineEntries = $this->offlineEntries(
            $this->offlineEngagements()->filter(
                fn (ServiceEngagement $engagement): bool => $this->fallsIn($engagement, $year, $month),
            ),
        );

        return $this->breakdown($orderEntries->merge($offlineEntries));
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
        $orderEntriesByMonth = $this->completedItemsQuery()
            ->whereHas('order', fn (Builder $query) => $query->whereYear('created_at', $year))
            ->get()
            ->groupBy(fn (OrderItem $item): string => $this->monthKeyFor($item->order->created_at))
            ->map(fn (Collection $items): SupportCollection => $this->orderEntries($items));

        $offlineEntriesByMonth = $this->offlineEngagements()
            ->filter(fn (ServiceEngagement $engagement): bool => (int) $engagement->offlineTitheDate()?->year === $year)
            ->groupBy(fn (ServiceEngagement $engagement): string => $this->monthKeyFor($engagement->offlineTitheDate()))
            ->map(fn (Collection $engagements): SupportCollection => $this->offlineEntries($engagements));

        $breakdowns = $orderEntriesByMonth->keys()
            ->merge($offlineEntriesByMonth->keys())
            ->unique()
            ->mapWithKeys(fn (string $key): array => [
                $key => $this->breakdown(
                    collect($orderEntriesByMonth->get($key, collect()))
                        ->merge($offlineEntriesByMonth->get($key, collect())),
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
     * The key one entry is settled under, unique within its month.
     */
    public function entryKey(string $sourceType, int $sourceId): string
    {
        return $sourceType.':'.$sourceId;
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
     * Order the month's entries by profit, largest first, and total them.
     *
     * @param  SupportCollection<int, TitheEntry>  $entries
     * @return MonthBreakdown
     */
    private function breakdown(SupportCollection $entries): array
    {
        $entries = $entries->values()->all();

        usort($entries, fn (array $a, array $b): int => $b['profit'] <=> $a['profit']);

        return [
            'entries' => $entries,
            'total_profit' => round(array_sum(array_column($entries, 'profit')), 2),
            'total_tithe' => round(array_sum(array_column($entries, 'tithe')), 2),
        ];
    }

    /**
     * One entry per completed order across the given items.
     *
     * @param  Collection<int, OrderItem>  $items
     * @return SupportCollection<int, TitheEntry>
     */
    private function orderEntries(Collection $items): SupportCollection
    {
        return $items
            ->groupBy('order_id')
            ->map(fn (Collection $orderItems): array => $this->orderEntry($orderItems))
            ->values()
            // Grouping an Eloquent collection yields another Eloquent collection,
            // whose merge() expects models; drop to a plain collection of arrays.
            ->toBase();
    }

    /**
     * The entry for one completed order, earning the profit of all its items.
     *
     * @param  Collection<int, OrderItem>  $orderItems
     * @return TitheEntry
     */
    private function orderEntry(Collection $orderItems): array
    {
        $order = $orderItems->firstOrFail()->order;
        $profit = round($orderItems->sum(fn (OrderItem $item): float => $item->profitNpr()), 2);

        return [
            'source_type' => self::SOURCE_ORDER,
            'source_id' => $order->id,
            'label' => $this->orderLabel($orderItems),
            'reference' => $order->order_number,
            'profit' => $profit,
            'tithe' => round($profit * self::TITHE_RATE, 2),
        ];
    }

    /**
     * What an order sold, as a comma-separated list of distinct product titles.
     *
     * @param  Collection<int, OrderItem>  $orderItems
     */
    private function orderLabel(Collection $orderItems): string
    {
        $titles = $orderItems
            ->map(fn (OrderItem $item): ?string => $item->productVariant?->product?->title)
            ->filter()
            ->unique()
            ->values();

        return $titles->isEmpty() ? 'Order' : $titles->implode(', ');
    }

    /**
     * One entry per offline engagement.
     *
     * @param  Collection<int, ServiceEngagement>  $engagements
     * @return SupportCollection<int, TitheEntry>
     */
    private function offlineEntries(Collection $engagements): SupportCollection
    {
        return $engagements
            ->map(fn (ServiceEngagement $engagement): array => $this->offlineEntry($engagement))
            ->values()
            ->toBase();
    }

    /**
     * The entry for one offline engagement, earning its manually tracked profit.
     *
     * @return TitheEntry
     */
    private function offlineEntry(ServiceEngagement $engagement): array
    {
        $profit = round($engagement->offlineProfitNpr(), 2);

        return [
            'source_type' => self::SOURCE_SERVICE,
            'source_id' => $engagement->id,
            'label' => $engagement->product?->title ?? $engagement->project_name ?? 'Offline service',
            'reference' => $engagement->project_name ?? 'Service #'.$engagement->id,
            'profit' => $profit,
            'tithe' => round($profit * self::TITHE_RATE, 2),
        ];
    }

    /**
     * Every engagement that tracks its profit offline. Loaded whole because the
     * tithe month is derived from a date no single indexed column can be filtered
     * on across drivers; the set is small since offline tracking is a deliberate,
     * manual exception.
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
            ->orderBy('id')
            ->with(['order:id,order_number,status,created_at', 'serviceEngagements', 'productVariant.product']);
    }

    private function monthKeyFor(CarbonInterface $createdAt): string
    {
        return $this->monthKey((int) $createdAt->year, (int) $createdAt->month);
    }
}
