<?php

namespace App\Services\Procurement;

use App\Casts\WalletCredits;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WalletPurchase;
use App\Models\WalletTopUp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only writer of supplier wallet balances. Each supplier holds one
 * prepaid wallet.
 *
 * Every top-up is a cost lot. A purchase consumes credits from the oldest lot
 * that still has any (FIFO) and records exactly which lots it drew from and
 * what that share cost, so its NPR cost is the true cost basis of the
 * credits it used even when several top-ups at different rates are mixed in
 * one wallet. Reversing a purchase hands those credits back to the same lots.
 *
 * Each lot tracks its remaining cost alongside its remaining credits, and the
 * allocation that empties a lot takes whatever cost is left. A lot is
 * therefore always expensed for exactly what it cost, with no paisa lost to
 * rounding however many purchases share it.
 */
class WalletLedger
{
    /**
     * Record a top-up as a new cost lot.
     *
     * @param  array{reference?: string|null, face_value: string|float, amount_paid: string|float, paid_currency: string, fx_rate: string|float, credits_received: string|float, topped_up_at: string|Carbon, notes?: string|null}  $data
     */
    public function recordTopUp(Supplier $supplier, array $data): WalletTopUp
    {
        $attributes = $this->topUpAttributes($data);

        return $supplier->topUps()->create([
            ...$attributes,
            'cost_remaining_npr' => $attributes['cost_npr'],
            'credits_remaining' => $attributes['credits_received'],
        ]);
    }

    /**
     * Correct a top-up. Amounts can only change while no purchase has drawn
     * on the lot, because a purchase's cost was fixed from them.
     *
     * @param  array{reference?: string|null, face_value?: string|float, amount_paid?: string|float, paid_currency?: string, fx_rate?: string|float, credits_received?: string|float, topped_up_at?: string|Carbon, notes?: string|null}  $data
     */
    public function updateTopUp(WalletTopUp $topUp, array $data): WalletTopUp
    {
        if (! $topUp->isUntouched()) {
            $topUp->update(array_intersect_key($data, array_flip(['reference', 'notes', 'topped_up_at'])));

            return $topUp;
        }

        $attributes = $this->topUpAttributes($data);

        $topUp->update([
            ...$attributes,
            'cost_remaining_npr' => $attributes['cost_npr'],
            'credits_remaining' => $attributes['credits_received'],
        ]);

        return $topUp;
    }

    /**
     * Remove a top-up that nothing has drawn on yet.
     */
    public function deleteTopUp(WalletTopUp $topUp): void
    {
        if (! $topUp->isUntouched()) {
            throw ValidationException::withMessages([
                'top_up' => 'Some of these credits are used. Undo those purchases first.',
            ]);
        }

        $topUp->delete();
    }

    /**
     * Pay for a purchase out of the wallet, oldest credits first. A personal
     * purchase spends the credits the same way but leaves the variant's
     * supplier cost alone.
     *
     * @param  array{unit_cost_credits: string|float, quantity: int, is_personal?: bool, product_variant_id?: int|null, description?: string|null, reference?: string|null, purchased_at: string|Carbon, notes?: string|null}  $data
     */
    public function recordPurchase(Supplier $supplier, array $data, ?User $user = null): WalletPurchase
    {
        $quantity = max(1, (int) $data['quantity']);
        $unitCostUnits = WalletCredits::toUnits($data['unit_cost_credits']);
        $creditsNeeded = $unitCostUnits * $quantity;

        if ($unitCostUnits <= 0) {
            throw ValidationException::withMessages(['unit_cost_credits' => 'Must be more than 0.']);
        }

        return DB::transaction(function () use ($supplier, $data, $user, $quantity, $unitCostUnits, $creditsNeeded): WalletPurchase {
            $lots = $supplier->topUps()
                ->where('credits_remaining', '>', 0)
                ->orderBy('topped_up_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $available = $lots->sum(fn (WalletTopUp $lot): int => $lot->creditsRemainingUnits());

            if ($available < $creditsNeeded) {
                throw ValidationException::withMessages([
                    'unit_cost_credits' => sprintf(
                        'Not enough credits. You have %s, need %s.',
                        WalletCredits::toDecimal($available),
                        WalletCredits::toDecimal($creditsNeeded),
                    ),
                ]);
            }

            $allocations = [];
            $totalCostPaisa = 0;
            $outstanding = $creditsNeeded;

            foreach ($lots as $lot) {
                if ($outstanding === 0) {
                    break;
                }

                $remainingUnits = $lot->creditsRemainingUnits();
                $remainingCost = $lot->costRemainingPaisa();
                $takenUnits = min($outstanding, $remainingUnits);

                $takenCost = $takenUnits === $remainingUnits
                    ? $remainingCost
                    : (int) round($remainingCost * $takenUnits / $remainingUnits);

                $lot->forceFill([
                    'credits_remaining' => WalletCredits::toDecimal($remainingUnits - $takenUnits),
                    'cost_remaining_npr' => ($remainingCost - $takenCost) / 100,
                ])->save();

                $allocations[] = [
                    'wallet_top_up_id' => $lot->id,
                    'credits' => WalletCredits::toDecimal($takenUnits),
                    'cost_npr' => $takenCost / 100,
                ];

                $totalCostPaisa += $takenCost;
                $outstanding -= $takenUnits;
            }

            $purchase = $supplier->purchases()->create([
                'product_variant_id' => $data['product_variant_id'] ?? null,
                'user_id' => $user?->id,
                'is_personal' => (bool) ($data['is_personal'] ?? false),
                'description' => $data['description'] ?? null,
                'reference' => $data['reference'] ?? null,
                'quantity' => $quantity,
                'unit_cost_credits' => WalletCredits::toDecimal($unitCostUnits),
                'credits_spent' => WalletCredits::toDecimal($creditsNeeded),
                'cost_npr' => $totalCostPaisa / 100,
                'purchased_at' => $data['purchased_at'],
                'notes' => $data['notes'] ?? null,
            ]);

            $purchase->allocations()->createMany($allocations);

            $this->rememberSupplierCost($purchase);

            return $purchase;
        });
    }

    /**
     * Undo a purchase, e.g. a supplier refund or a mistaken entry, returning
     * its credits and their cost to the lots they came from.
     */
    public function reversePurchase(WalletPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase): void {
            $purchase->load('allocations');

            $lots = WalletTopUp::query()
                ->whereIn('id', $purchase->allocations->pluck('wallet_top_up_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($purchase->allocations as $allocation) {
                $lot = $lots[$allocation->wallet_top_up_id];

                $lot->forceFill([
                    'credits_remaining' => WalletCredits::toDecimal($lot->creditsRemainingUnits() + $allocation->creditUnits()),
                    'cost_remaining_npr' => ($lot->costRemainingPaisa() + $allocation->costPaisa()) / 100,
                ])->save();
            }

            $purchase->delete();
        });
    }

    /**
     * Wallet totals, derived from the lots so they can never drift from them.
     *
     * @return array{balance_units: int, cost_remaining_paisa: int, average_npr_per_credit: float|null, latest_npr_per_credit: float|null}
     */
    public function summary(Supplier $supplier): array
    {
        $totals = $supplier->topUps()
            ->selectRaw('COALESCE(SUM(credits_remaining), 0) as balance_units, COALESCE(SUM(cost_remaining_npr), 0) as cost_remaining_paisa')
            ->toBase()
            ->first();

        $balanceUnits = (int) ($totals->balance_units ?? 0);
        $costRemainingPaisa = (int) ($totals->cost_remaining_paisa ?? 0);
        $latest = $supplier->relationLoaded('latestTopUp') ? $supplier->latestTopUp : $supplier->latestTopUp()->first();

        return [
            'balance_units' => $balanceUnits,
            'cost_remaining_paisa' => $costRemainingPaisa,
            'average_npr_per_credit' => $balanceUnits > 0
                ? ($costRemainingPaisa / 100) / ($balanceUnits / WalletCredits::SCALE)
                : null,
            'latest_npr_per_credit' => $latest?->nprPerCredit(),
        ];
    }

    /**
     * Normalise top-up input into stored attributes. Paying in NPR needs no
     * conversion, so its rate is pinned to 1 whatever was submitted.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function topUpAttributes(array $data): array
    {
        $paidCurrency = strtoupper((string) $data['paid_currency']);
        $fxRate = $paidCurrency === 'NPR' ? 1.0 : (float) $data['fx_rate'];

        return [
            'reference' => $data['reference'] ?? null,
            'face_value' => $data['face_value'],
            'amount_paid' => $data['amount_paid'],
            'paid_currency' => $paidCurrency,
            'fx_rate' => $fxRate,
            'cost_npr' => round((float) $data['amount_paid'] * $fxRate, 2),
            'credits_received' => $data['credits_received'],
            'topped_up_at' => $data['topped_up_at'],
            'notes' => $data['notes'] ?? null,
        ];
    }

    /**
     * Keep the variant's reference supplier cost at its most recent purchase,
     * so the calculator starts from what the supplier charges now. A
     * back-dated entry does not overwrite a newer observation, and a personal
     * purchase is not stock for a sale, so it is no observation at all.
     */
    private function rememberSupplierCost(WalletPurchase $purchase): void
    {
        if ($purchase->product_variant_id === null || $purchase->is_personal) {
            return;
        }

        $isMostRecent = ! WalletPurchase::query()
            ->where('product_variant_id', $purchase->product_variant_id)
            ->where('is_personal', false)
            ->whereKeyNot($purchase->id)
            ->where('purchased_at', '>', $purchase->purchased_at)
            ->exists();

        if (! $isMostRecent) {
            return;
        }

        ProductVariant::query()->whereKey($purchase->product_variant_id)->update([
            'supplier_id' => $purchase->supplier_id,
            'supplier_cost_credits' => WalletCredits::toUnits($purchase->unit_cost_credits),
        ]);
    }
}
