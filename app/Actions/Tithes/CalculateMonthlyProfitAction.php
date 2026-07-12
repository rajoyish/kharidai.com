<?php

namespace App\Actions\Tithes;

use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Breaks a calendar month's completed-order profit down per product, and levies
 * the tithe on that profit. Revenue never enters into it: a product only owes a
 * tithe on what it actually earned after its cost of goods.
 *
 * @phpstan-type ProductBreakdown array{product_id: int, name: string, type: string, profit: float, tithe: float}
 * @phpstan-type MonthBreakdown array{products: list<ProductBreakdown>, total_profit: float, total_tithe: float}
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
        $items = $this->completedItemsQuery()
            ->whereHas('order', fn (Builder $query) => $query
                ->whereYear('created_at', $year)
                ->whereMonth('created_at', $month),
            )
            ->get();

        return $this->breakdown($items);
    }

    /**
     * Every month of the given year that has completed orders, keyed "year-month"
     * and newest first. One pass over the year's order items serves every month in
     * it, so the tithes page costs the same handful of queries whether the year
     * holds one month or twelve.
     *
     * @return array<string, MonthBreakdown>
     */
    public function executeForYear(int $year): array
    {
        $breakdowns = $this->completedItemsQuery()
            ->whereHas('order', fn (Builder $query) => $query->whereYear('created_at', $year))
            ->get()
            ->groupBy(fn (OrderItem $item): string => $this->monthKeyFor($item->order->created_at))
            ->map(fn (Collection $items): array => $this->breakdown($items))
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
     * @param  Collection<int, OrderItem>  $items
     * @return MonthBreakdown
     */
    private function breakdown(Collection $items): array
    {
        $products = $this->profitByProduct($items);

        return [
            'products' => $products,
            'total_profit' => round(array_sum(array_column($products, 'profit')), 2),
            'total_tithe' => round(array_sum(array_column($products, 'tithe')), 2),
        ];
    }

    /**
     * @param  Collection<int, OrderItem>  $items
     * @return list<ProductBreakdown>
     */
    private function profitByProduct(Collection $items): array
    {
        $products = [];

        foreach ($items->groupBy('productVariant.product_id') as $productItems) {
            /** @var Collection<int, OrderItem> $productItems */
            $product = $productItems->first()->productVariant->product;
            $profit = round($productItems->sum(fn (OrderItem $item): float => $item->profitNpr()), 2);

            $products[] = [
                'product_id' => $product->id,
                'name' => $product->title,
                'type' => $product->type->value,
                'profit' => $profit,
                'tithe' => round($profit * self::TITHE_RATE, 2),
            ];
        }

        usort($products, fn (array $a, array $b): int => $b['profit'] <=> $a['profit']);

        return $products;
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
