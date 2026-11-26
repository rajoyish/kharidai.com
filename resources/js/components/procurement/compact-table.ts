/**
 * Tightens a ledger-style table, such as price history or purchases, where
 * many short rows read better close together than the roomy default cells.
 * Applied to `<Table className>`; the descendant selectors outrank the cells'
 * own padding, so the shared table component stays unchanged for everyone else.
 */
export const COMPACT_TABLE = [
    '[&_th]:px-3 [&_th]:py-2.5 [&_th]:text-[11px] [&_th]:tracking-wide',
    '[&_td]:px-3 [&_td]:py-2',
    '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4',
    '[&_th:last-child]:pr-4 [&_td:last-child]:pr-4',
    // Second lines under a value (who, which supplier) sit snug beneath it.
    '[&_td_.text-xs]:leading-tight',
].join(' ');
