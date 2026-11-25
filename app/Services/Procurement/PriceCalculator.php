<?php

namespace App\Services\Procurement;

use App\Casts\WalletCredits;
use App\Enums\CostBasis;
use App\Enums\PriceRounding;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\WalletTopUp;
use Illuminate\Database\Eloquent\Collection;

/**
 * Turns a supplier cost in wallet credits into a landed NPR cost and a
 * suggested selling price.
 *
 * A credit has no single NPR value: the wallet holds credits from several
 * top-ups, each bought at its own effective rate (voucher markup, conversion
 * deductions and the exchange rate on the day all baked in). The cost basis
 * decides which rate a quote uses — see {@see CostBasis}. Quotes are
 * read-only; only {@see WalletLedger} moves balances.
 *
 * @phpstan-type QuoteInput array{supplier_id?: int|null, supplier_cost_credits: string|float, cost_basis: string, manual_npr_per_credit?: string|float|null, extra_cost_npr?: string|float|null, profit_mode: string, target_profit_npr?: string|float|null, target_margin_percent?: string|float|null, rounding: string, final_price_npr?: string|float|null}
 * @phpstan-type LotShare array{top_up_id: int, reference: string|null, topped_up_at: string, credits: string, npr_per_credit: float, cost_npr: float}
 * @phpstan-type Quote array{cost_basis: string, supplier_id: int|null, balance_credits: string|null, balance_after_credits: string|null, npr_per_credit: float|null, supplier_cost_credits: string, landed_cost_npr: float|null, extra_cost_npr: float, total_cost_npr: float|null, suggested_price_npr: float|null, selling_price_npr: float|null, profit_npr: float|null, margin_percent: float|null, markup_percent: float|null, lots: list<LotShare>, shortfall_credits: string|null, warnings: list<string>, bases: array<string, float|null>}
 */
class PriceCalculator
{
    /**
     * Lots with credits left, per wallet, oldest first. Memoised so pricing a
     * whole variant list reads each wallet once.
     *
     * @var array<int, Collection<int, WalletTopUp>>
     */
    private array $openLots = [];

    /**
     * @var array<int, WalletTopUp|null>
     */
    private array $latestLots = [];

    /**
     * Price one unit of a variant.
     *
     * @param  QuoteInput  $input
     * @return Quote
     */
    public function quote(array $input): array
    {
        $basis = CostBasis::from($input['cost_basis']);
        $rounding = PriceRounding::from($input['rounding']);
        $creditUnits = WalletCredits::toUnits($input['supplier_cost_credits']);
        $credits = $creditUnits / WalletCredits::SCALE;
        $extraCost = round((float) ($input['extra_cost_npr'] ?? 0), 2);
        $wallet = isset($input['supplier_id']) ? Supplier::find($input['supplier_id']) : null;

        $warnings = [];
        $lots = [];
        $shortfallUnits = 0;
        $bases = $wallet ? $this->landedCostByBasis($wallet, $creditUnits) : [];

        $landedCost = match ($basis) {
            CostBasis::Manual => isset($input['manual_npr_per_credit']) && $input['manual_npr_per_credit'] !== ''
                ? $credits * (float) $input['manual_npr_per_credit']
                : null,
            CostBasis::Fifo => $wallet ? $this->fifo($wallet, $creditUnits, $lots, $shortfallUnits) : null,
            CostBasis::Average, CostBasis::Latest => $bases[$basis->value] ?? null,
        };

        if ($basis !== CostBasis::Manual && $wallet === null) {
            $warnings[] = 'Pick a supplier.';
        } elseif ($landedCost === null && $basis !== CostBasis::Manual) {
            $warnings[] = 'This supplier has no top-ups yet.';
        }

        if ($shortfallUnits > 0) {
            $warnings[] = sprintf(
                'Not enough credits: %s short. Top up before buying.',
                WalletCredits::toDecimal($shortfallUnits),
            );
        }

        $latestRate = $wallet ? $this->latestLot($wallet)?->nprPerCredit() : null;

        if ($basis === CostBasis::Fifo && $landedCost !== null && $latestRate !== null && $credits > 0) {
            $fifoRate = $landedCost / $credits;

            if ($latestRate > $fifoRate * 1.03) {
                $warnings[] = sprintf(
                    'Your latest top-up is %s%% more expensive. Price may be too low once old credits run out.',
                    number_format(($latestRate / $fifoRate - 1) * 100, 1),
                );
            }
        }

        $totalCost = $landedCost === null ? null : round($landedCost + $extraCost, 2);
        $suggested = $totalCost === null ? null : $this->suggestedPrice($totalCost, $input, $rounding, $warnings);

        $override = $input['final_price_npr'] ?? null;
        $sellingPrice = $override !== null && $override !== '' ? round((float) $override, 2) : $suggested;
        $profit = $sellingPrice !== null && $totalCost !== null ? round($sellingPrice - $totalCost, 2) : null;

        if ($profit !== null && $profit < 0) {
            $warnings[] = 'This price is below cost. You will lose money.';
        }

        $balanceUnits = $wallet ? $this->openLots($wallet)->sum(fn (WalletTopUp $lot): int => $lot->creditsRemainingUnits()) : null;

        return [
            'cost_basis' => $basis->value,
            'supplier_id' => $wallet?->id,
            'balance_credits' => $balanceUnits === null ? null : WalletCredits::toDecimal($balanceUnits),
            'balance_after_credits' => $balanceUnits === null ? null : WalletCredits::toDecimal($balanceUnits - $creditUnits),
            'npr_per_credit' => $landedCost !== null && $credits > 0 ? $landedCost / $credits : null,
            'supplier_cost_credits' => WalletCredits::toDecimal($creditUnits),
            'landed_cost_npr' => $landedCost === null ? null : round($landedCost, 2),
            'extra_cost_npr' => $extraCost,
            'total_cost_npr' => $totalCost,
            'suggested_price_npr' => $suggested,
            'selling_price_npr' => $sellingPrice,
            'profit_npr' => $profit,
            'margin_percent' => $profit !== null && $sellingPrice > 0 ? round($profit / $sellingPrice * 100, 2) : null,
            'markup_percent' => $profit !== null && $totalCost > 0 ? round($profit / $totalCost * 100, 2) : null,
            'lots' => $lots,
            'shortfall_credits' => $shortfallUnits > 0 ? WalletCredits::toDecimal($shortfallUnits) : null,
            'warnings' => $warnings,
            'bases' => $bases,
        ];
    }

    /**
     * What a variant's reference supplier cost would land at today, for
     * spotting prices that have drifted from cost. Null when the variant has
     * no supplier cost or its supplier has no credits.
     */
    public function currentLandedCost(ProductVariant $variant, CostBasis $basis = CostBasis::Fifo): ?float
    {
        $creditUnits = $variant->supplier_cost_credits === null ? 0 : WalletCredits::toUnits($variant->supplier_cost_credits);

        if ($creditUnits <= 0 || $variant->supplier_id === null || $basis === CostBasis::Manual) {
            return null;
        }

        $wallet = $variant->relationLoaded('supplier') ? $variant->supplier : $variant->supplier()->first();

        if ($wallet === null) {
            return null;
        }

        return $this->landedCostByBasis($wallet, $creditUnits)[$basis->value] ?? null;
    }

    /**
     * Landed cost of the given credits under every wallet-backed basis, so
     * the screen can show how much the choice of basis moves the price.
     *
     * @return array<string, float|null>
     */
    private function landedCostByBasis(Supplier $wallet, int $creditUnits): array
    {
        $credits = $creditUnits / WalletCredits::SCALE;
        $lots = $this->openLots($wallet);
        $balanceUnits = $lots->sum(fn (WalletTopUp $lot): int => $lot->creditsRemainingUnits());
        $costPaisa = $lots->sum(fn (WalletTopUp $lot): int => $lot->costRemainingPaisa());
        $latestRate = $this->latestLot($wallet)?->nprPerCredit();

        $averageRate = $balanceUnits > 0 ? ($costPaisa / 100) / ($balanceUnits / WalletCredits::SCALE) : $latestRate;
        $ignoredLots = [];
        $ignoredShortfall = 0;

        return [
            CostBasis::Fifo->value => ($fifo = $this->fifo($wallet, $creditUnits, $ignoredLots, $ignoredShortfall)) === null ? null : round($fifo, 2),
            CostBasis::Average->value => $averageRate === null ? null : round($credits * $averageRate, 2),
            CostBasis::Latest->value => $latestRate === null ? null : round($credits * $latestRate, 2),
        ];
    }

    /**
     * Cost of the credits the next purchase would consume, walking lots
     * oldest first. Credits beyond the balance are priced at the latest
     * top-up rate, since that is what replacing them will cost.
     *
     * @param  list<LotShare>  $shares
     */
    private function fifo(Supplier $wallet, int $creditUnits, array &$shares, int &$shortfallUnits): ?float
    {
        $outstanding = $creditUnits;
        $cost = 0.0;

        foreach ($this->openLots($wallet) as $lot) {
            if ($outstanding <= 0) {
                break;
            }

            $takenUnits = min($outstanding, $lot->creditsRemainingUnits());
            $share = $lot->costRemainingPaisa() / 100 * $takenUnits / $lot->creditsRemainingUnits();

            $shares[] = [
                'top_up_id' => $lot->id,
                'reference' => $lot->reference,
                'topped_up_at' => $lot->topped_up_at->toDateString(),
                'credits' => WalletCredits::toDecimal($takenUnits),
                'npr_per_credit' => round($lot->nprPerCredit(), 6),
                'cost_npr' => round($share, 2),
            ];

            $cost += $share;
            $outstanding -= $takenUnits;
        }

        if ($outstanding > 0) {
            $latestRate = $this->latestLot($wallet)?->nprPerCredit();

            if ($latestRate === null) {
                return null;
            }

            $shortfallUnits = $outstanding;
            $cost += $outstanding / WalletCredits::SCALE * $latestRate;
        }

        return $cost;
    }

    /**
     * @param  QuoteInput  $input
     * @param  list<string>  $warnings
     */
    private function suggestedPrice(float $totalCost, array $input, PriceRounding $rounding, array &$warnings): float
    {
        if ($input['profit_mode'] === 'margin') {
            $margin = min(95.0, max(0.0, (float) ($input['target_margin_percent'] ?? 0)));
            $raw = $totalCost / (1 - $margin / 100);
        } else {
            $raw = $totalCost + (float) ($input['target_profit_npr'] ?? 0);
        }

        $rounded = $rounding->apply($raw);

        if ($rounded < $raw - 0.005) {
            $warnings[] = sprintf('Rounding lowers profit by Rs. %s.', number_format($raw - $rounded, 2));
        }

        return round($rounded, 2);
    }

    /**
     * @return Collection<int, WalletTopUp>
     */
    private function openLots(Supplier $wallet): Collection
    {
        return $this->openLots[$wallet->id] ??= $wallet->topUps()
            ->where('credits_remaining', '>', 0)
            ->orderBy('topped_up_at')
            ->orderBy('id')
            ->get();
    }

    private function latestLot(Supplier $wallet): ?WalletTopUp
    {
        if (! array_key_exists($wallet->id, $this->latestLots)) {
            $this->latestLots[$wallet->id] = $wallet->topUps()->latest('topped_up_at')->latest('id')->first();
        }

        return $this->latestLots[$wallet->id];
    }
}
