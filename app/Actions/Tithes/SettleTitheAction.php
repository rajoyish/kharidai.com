<?php

namespace App\Actions\Tithes;

use App\Models\MonthlyTithe;
use App\Models\MonthlyTitheItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Records which of a month's earning records have had their tithe paid, and keeps
 * the month's own paid flag in step with them: a month is settled only once every
 * order and offline engagement that earned profit in it has been settled.
 *
 * Every write here is keyed to a single order or engagement id, so settling one
 * entry cannot touch another.
 */
class SettleTitheAction
{
    /**
     * Settle or unsettle one order or engagement within the month.
     *
     * @param  list<array{source_type: string, source_id: int}>  $entries  everything that earned profit this month
     */
    public function settleEntry(MonthlyTithe $monthlyTithe, string $sourceType, int $sourceId, bool $isPaid, array $entries): void
    {
        DB::transaction(function () use ($monthlyTithe, $sourceType, $sourceId, $isPaid, $entries): void {
            $this->materializeItems($monthlyTithe, $entries);

            $monthlyTithe->items()
                ->where(MonthlyTitheItem::sourceColumns($sourceType, $sourceId))
                ->update($this->paidAttributes($isPaid));

            $this->syncMonthStatus($monthlyTithe, $entries);
        });
    }

    /**
     * Settle or unsettle everything in the month in one go.
     *
     * @param  list<array{source_type: string, source_id: int}>  $entries  everything that earned profit this month
     */
    public function settleMonth(MonthlyTithe $monthlyTithe, bool $isPaid, array $entries): void
    {
        DB::transaction(function () use ($monthlyTithe, $isPaid, $entries): void {
            $this->materializeItems($monthlyTithe, $entries);

            $monthlyTithe->items()->update($this->paidAttributes($isPaid));
            $monthlyTithe->update($this->paidAttributes($isPaid));
        });
    }

    /**
     * Give everything that earned profit this month a settlement record, seeded
     * from the month's own flag so that a month settled in bulk before entry-level
     * tracking existed does not read back as unpaid.
     *
     * @param  list<array{source_type: string, source_id: int}>  $entries
     */
    private function materializeItems(MonthlyTithe $monthlyTithe, array $entries): void
    {
        $existing = $monthlyTithe->items->map(fn (MonthlyTitheItem $item): string => $item->entryKey())->all();

        foreach ($entries as $entry) {
            $key = $entry['source_type'].':'.$entry['source_id'];

            if (in_array($key, $existing, true)) {
                continue;
            }

            $monthlyTithe->items()->create([
                ...MonthlyTitheItem::sourceColumns($entry['source_type'], $entry['source_id']),
                'is_paid' => $monthlyTithe->is_paid,
                'paid_at' => $monthlyTithe->is_paid ? $monthlyTithe->paid_at ?? now() : null,
            ]);
        }

        $monthlyTithe->unsetRelation('items');
    }

    /**
     * Re-derive the month's paid flag from its entries.
     *
     * @param  list<array{source_type: string, source_id: int}>  $entries
     */
    private function syncMonthStatus(MonthlyTithe $monthlyTithe, array $entries): void
    {
        $settled = $monthlyTithe->items()
            ->where('is_paid', true)
            ->get()
            ->map(fn (MonthlyTitheItem $item): string => $item->entryKey())
            ->all();

        $keys = array_map(fn (array $entry): string => $entry['source_type'].':'.$entry['source_id'], $entries);

        $isPaid = $keys !== [] && array_diff($keys, $settled) === [];

        if ($isPaid === $monthlyTithe->is_paid) {
            return;
        }

        $monthlyTithe->update($this->paidAttributes($isPaid));
    }

    /**
     * @return array{is_paid: bool, paid_at: Carbon|null}
     */
    private function paidAttributes(bool $isPaid): array
    {
        return [
            'is_paid' => $isPaid,
            'paid_at' => $isPaid ? now() : null,
        ];
    }
}
