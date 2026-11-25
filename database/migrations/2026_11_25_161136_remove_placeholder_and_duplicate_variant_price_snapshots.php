<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Removes price history rows written before two bugs were fixed:
 *
 * - The Create Variant form required a selling price, so admins typed a
 *   placeholder (e.g. Rs. 1) that became the variant's first, "Edited" row
 *   before the calculator set the real price.
 * - Applying the same calculator quote twice appended an identical row.
 *
 * Only rows that are clearly one of these are deleted; anything with a note
 * or a different value is kept.
 */
return new class extends Migration
{
    /**
     * A first manual row at or below this price (in paisa) is a placeholder.
     */
    private const PLACEHOLDER_MAX_PAISA = 100;

    /**
     * The columns that make two calculator rows the same recorded price.
     *
     * @var list<string>
     */
    private const RECORDED_COLUMNS = [
        'supplier_id',
        'selling_price_npr',
        'purchase_price_npr',
        'landed_cost_npr',
        'supplier_cost_credits',
        'npr_per_credit',
        'cost_basis',
        'target_profit_npr',
        'target_margin_percent',
        'extra_cost_npr',
        'rounding',
    ];

    public function up(): void
    {
        $doomed = [];

        DB::table('variant_price_snapshots')
            ->orderBy('product_variant_id')
            ->orderBy('id')
            ->get()
            ->groupBy('product_variant_id')
            ->each(function ($rows) use (&$doomed): void {
                $rows = $rows->values();

                foreach ($rows as $index => $row) {
                    $previous = $rows[$index - 1] ?? null;

                    if ($index === 0 && $rows->count() > 1 && $this->isPlaceholder($row)) {
                        $doomed[] = $row->id;
                    } elseif ($previous !== null && $this->repeats($row, $previous)) {
                        $doomed[] = $row->id;
                    }
                }
            });

        foreach (array_chunk($doomed, 500) as $ids) {
            DB::table('variant_price_snapshots')->whereIn('id', $ids)->delete();
        }
    }

    /**
     * Deleted history cannot be restored.
     */
    public function down(): void {}

    private function isPlaceholder(object $row): bool
    {
        return $row->source === 'manual'
            && (int) $row->selling_price_npr <= self::PLACEHOLDER_MAX_PAISA
            && blank($row->notes);
    }

    private function repeats(object $row, object $previous): bool
    {
        if ($row->source !== 'calculator' || $previous->source !== 'calculator' || filled($row->notes)) {
            return false;
        }

        foreach (self::RECORDED_COLUMNS as $column) {
            if ((string) $row->{$column} !== (string) $previous->{$column}) {
                return false;
            }
        }

        return true;
    }
};
