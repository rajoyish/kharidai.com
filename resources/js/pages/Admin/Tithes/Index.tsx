import { Link, router } from '@inertiajs/react';
import { CalendarOff, Circle, CircleCheck } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PagePanel } from '@/components/page-panel';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNpr } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import { show as showOrder } from '@/routes/admin/orders';
import { show as showService } from '@/routes/admin/services';
import { index as adminTithesIndex, toggleStatus } from '@/routes/admin/tithes';
import { toggleStatus as toggleOrderStatus } from '@/routes/admin/tithes/orders';
import { toggleStatus as toggleServiceStatus } from '@/routes/admin/tithes/services';

type PaymentStatus = 'paid' | 'partial' | 'unpaid';

/**
 * One settleable record: a completed order, or an offline service engagement.
 * Never a group of either, so its toggle moves nothing else on the page.
 */
type TitheEntry = {
    source_type: 'order' | 'service';
    source_id: number;
    label: string;
    reference: string;
    profit: number;
    tithe: number;
    is_paid: boolean;
    paid_at: string | null;
};

type Tithe = {
    id: number;
    month: number;
    year: number;
    label: string;
    entries: TitheEntry[];
    total_amount: number;
    total_profit: number;
    paid_amount: number;
    outstanding_amount: number;
    payment_status: PaymentStatus;
    is_paid: boolean;
    paid_at: string | null;
};

/**
 * Entries that sold the same thing, collected under one heading so the item
 * name is read once instead of once per order.
 */
type EntryGroup = {
    label: string;
    entries: TitheEntry[];
    profit: number;
    tithe: number;
    paidCount: number;
};

/** Which control, if any, is waiting on the server. Null entryKey is the month. */
type Processing = { titheId: number; entryKey: string | null };

const breadcrumbs = [
    { title: 'Admin Dashboard', href: dashboard().url },
    { title: 'Tithes', href: adminTithesIndex().url },
];

const statusLabels: Record<PaymentStatus, string> = {
    paid: 'Paid',
    partial: 'Partially Paid',
    unpaid: 'Unpaid',
};

const statusClasses: Record<PaymentStatus, string> = {
    paid: 'border-transparent bg-success-surface text-success',
    partial: 'border-transparent bg-info-surface text-info',
    unpaid: 'border-transparent bg-warning-surface text-warning',
};

/** Tighter gutters on phones keep the table readable without sideways scrolling. */
const cellPadding = 'px-4 sm:px-6';

function entryKey(entry: TitheEntry): string {
    return `${entry.source_type}:${entry.source_id}`;
}

function entryHref(entry: TitheEntry): string {
    return entry.source_type === 'order'
        ? showOrder(entry.source_id).url
        : showService(entry.source_id).url;
}

function toMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

/** First appearance sets a group's position, so the month keeps its own order. */
function groupEntries(entries: TitheEntry[]): EntryGroup[] {
    const groups: EntryGroup[] = [];
    const byLabel = new Map<string, EntryGroup>();

    for (const entry of entries) {
        let group = byLabel.get(entry.label);

        if (group === undefined) {
            group = {
                label: entry.label,
                entries: [],
                profit: 0,
                tithe: 0,
                paidCount: 0,
            };
            byLabel.set(entry.label, group);
            groups.push(group);
        }

        group.entries.push(entry);
        group.profit = toMoney(group.profit + entry.profit);
        group.tithe = toMoney(group.tithe + entry.tithe);
        group.paidCount += entry.is_paid ? 1 : 0;
    }

    return groups;
}

/**
 * Re-derive a month's totals and status from its entries, so an optimistic change
 * moves the summaries with it instead of waiting for the server.
 */
function recalculate(tithe: Tithe): Tithe {
    const paidEntries = tithe.entries.filter((entry) => entry.is_paid);
    const paidAmount = toMoney(
        paidEntries.reduce((carry, entry) => carry + entry.tithe, 0),
    );
    const isPaid =
        tithe.entries.length > 0 && paidEntries.length === tithe.entries.length;

    return {
        ...tithe,
        paid_amount: paidAmount,
        outstanding_amount: toMoney(tithe.total_amount - paidAmount),
        payment_status: isPaid
            ? 'paid'
            : paidEntries.length > 0
              ? 'partial'
              : 'unpaid',
        is_paid: isPaid,
        paid_at: isPaid ? (tithe.paid_at ?? new Date().toISOString()) : null,
    };
}

/** Passing a null key settles the whole month; otherwise only that one entry. */
function applyPaid(
    tithes: Tithe[],
    titheId: number,
    isPaid: boolean,
    key: string | null,
): Tithe[] {
    const paidAt = isPaid ? new Date().toISOString() : null;

    return tithes.map((tithe) =>
        tithe.id === titheId
            ? recalculate({
                  ...tithe,
                  entries: tithe.entries.map((entry) =>
                      key === null || entryKey(entry) === key
                          ? { ...entry, is_paid: isPaid, paid_at: paidAt }
                          : entry,
                  ),
              })
            : tithe,
    );
}

function YearSummary({ year, tithes }: { year: number; tithes: Tithe[] }) {
    const totals = useMemo(() => {
        return tithes.reduce(
            (carry, tithe) => ({
                payable: carry.payable + tithe.total_amount,
                paid: carry.paid + tithe.paid_amount,
                outstanding: carry.outstanding + tithe.outstanding_amount,
            }),
            { payable: 0, paid: 0, outstanding: 0 },
        );
    }, [tithes]);

    const stats = [
        { label: `Total Tithe ${year}`, value: totals.payable, accent: '' },
        { label: 'Paid', value: totals.paid, accent: '' },
        {
            label: 'Outstanding',
            value: totals.outstanding,
            accent: totals.outstanding > 0 ? 'text-warning' : '',
        },
    ];

    return (
        <dl className="grid gap-px overflow-hidden rounded-xl border bg-border shadow-sm sm:grid-cols-3">
            {stats.map((stat) => (
                <div key={stat.label} className="bg-card p-5">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {stat.label}
                    </dt>
                    <dd
                        className={cn(
                            'mt-1.5 text-2xl font-semibold tabular-nums',
                            stat.accent,
                        )}
                    >
                        {formatNpr(stat.value)}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function EmptyYear({ year }: { year: number }) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card p-12 text-center shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarOff className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
                No tithes recorded for {year}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Tithes appear here once orders from {year} are marked completed.
                Pick another year to review earlier records.
            </p>
        </div>
    );
}

function EmptySearch() {
    return (
        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card p-12 text-center shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarOff className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No matching tithes</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                No month, order or service in this year matches your search.
                Clear it to see every tithe again.
            </p>
        </div>
    );
}

function EntryReference({ entry }: { entry: TitheEntry }) {
    return (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
                href={entryHref(entry)}
                className="font-medium text-primary underline-offset-4 hover:underline"
            >
                {entry.reference}
            </Link>
            {entry.source_type === 'service' && (
                <span className="rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Offline
                </span>
            )}
        </span>
    );
}

function EntryStatusButton({
    entry,
    isUpdating,
    isDisabled,
    onToggle,
}: {
    entry: TitheEntry;
    isUpdating: boolean;
    isDisabled: boolean;
    onToggle: () => void;
}) {
    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            onClick={onToggle}
            aria-pressed={entry.is_paid}
            aria-label={`Mark ${entry.reference} tithe as ${entry.is_paid ? 'unpaid' : 'paid'}`}
            title={
                entry.is_paid && entry.paid_at
                    ? `Paid on ${new Date(entry.paid_at).toLocaleDateString()}`
                    : undefined
            }
            className={cn(
                'h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium',
                entry.is_paid
                    ? 'bg-success-surface text-success hover:bg-success-surface/70 hover:text-success'
                    : 'bg-warning-surface text-warning hover:bg-warning-surface/70 hover:text-warning',
            )}
        >
            {isUpdating ? (
                <Spinner className="size-3.5" />
            ) : entry.is_paid ? (
                <CircleCheck className="size-3.5" />
            ) : (
                <Circle className="size-3.5" />
            )}
            {entry.is_paid ? 'Paid' : 'Unpaid'}
        </Button>
    );
}

function EntryRow({
    entry,
    heading,
    isUpdating,
    isDisabled,
    onToggle,
}: {
    entry: TitheEntry;
    /** The item name, shown only when this row is not under a group heading. */
    heading: string | null;
    isUpdating: boolean;
    isDisabled: boolean;
    onToggle: () => void;
}) {
    return (
        <TableRow>
            <TableCell
                className={cn(
                    'py-3',
                    cellPadding,
                    heading === null && 'pl-8 sm:pl-12',
                )}
            >
                {heading !== null && (
                    <div className="font-medium">{heading}</div>
                )}
                <div
                    className={cn(
                        'text-sm',
                        heading !== null && 'mt-0.5 text-muted-foreground',
                    )}
                >
                    <EntryReference entry={entry} />
                </div>
            </TableCell>
            <TableCell
                className={cn(
                    'hidden py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell',
                    cellPadding,
                )}
            >
                {formatNpr(entry.profit)}
            </TableCell>
            <TableCell
                className={cn(
                    'py-3 text-right font-semibold whitespace-nowrap tabular-nums',
                    cellPadding,
                )}
            >
                {formatNpr(entry.tithe)}
            </TableCell>
            <TableCell className={cn('py-3 text-right', cellPadding)}>
                <EntryStatusButton
                    entry={entry}
                    isUpdating={isUpdating}
                    isDisabled={isDisabled}
                    onToggle={onToggle}
                />
            </TableCell>
        </TableRow>
    );
}

function MonthlyTitheSummary({
    tithe,
    processing,
    onToggleStatus,
    onToggleEntryStatus,
}: {
    tithe: Tithe;
    processing: Processing | null;
    onToggleStatus: (tithe: Tithe) => void;
    onToggleEntryStatus: (tithe: Tithe, entry: TitheEntry) => void;
}) {
    // One request at a time per month keeps its running totals unambiguous.
    const isBusy = processing?.titheId === tithe.id;
    const isMonthUpdating = isBusy && processing.entryKey === null;

    const groups = useMemo(() => groupEntries(tithe.entries), [tithe.entries]);

    const meta = [
        `${tithe.entries.length} ${tithe.entries.length === 1 ? 'entry' : 'entries'}`,
    ];

    if (tithe.payment_status === 'partial') {
        meta.push(
            `${formatNpr(tithe.paid_amount)} paid`,
            `${formatNpr(tithe.outstanding_amount)} outstanding`,
        );
    } else if (tithe.payment_status === 'paid' && tithe.paid_at) {
        meta.push(`Paid on ${new Date(tithe.paid_at).toLocaleDateString()}`);
    }

    return (
        <section className="flex flex-col gap-3">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-base font-semibold">{tithe.label}</h2>
                    <Badge
                        variant="outline"
                        className={statusClasses[tithe.payment_status]}
                    >
                        {statusLabels[tithe.payment_status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {meta.join(' · ')}
                    </span>
                </div>

                <Button
                    variant={tithe.is_paid ? 'outline' : 'default'}
                    size="sm"
                    disabled={isBusy}
                    onClick={() => onToggleStatus(tithe)}
                >
                    {isMonthUpdating
                        ? 'Updating...'
                        : tithe.is_paid
                          ? 'Mark Unpaid'
                          : 'Mark All Paid'}
                </Button>
            </header>

            <Table className="min-w-0">
                <TableHeader>
                    <TableRow>
                        <TableHead className={cellPadding}>Item</TableHead>
                        <TableHead
                            className={cn(
                                'hidden text-right sm:table-cell',
                                cellPadding,
                            )}
                        >
                            Profit
                        </TableHead>
                        <TableHead className={cn('text-right', cellPadding)}>
                            Tithe
                        </TableHead>
                        <TableHead className={cn('text-right', cellPadding)}>
                            Status
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groups.map((group) =>
                        group.entries.length === 1 ? (
                            <EntryRow
                                key={entryKey(group.entries[0])}
                                entry={group.entries[0]}
                                heading={group.label}
                                isUpdating={
                                    isBusy &&
                                    processing.entryKey ===
                                        entryKey(group.entries[0])
                                }
                                isDisabled={isBusy}
                                onToggle={() =>
                                    onToggleEntryStatus(tithe, group.entries[0])
                                }
                            />
                        ) : (
                            <Fragment key={group.label}>
                                <TableRow className="bg-muted hover:bg-muted">
                                    <TableCell
                                        className={cn(
                                            'py-2.5 font-medium',
                                            cellPadding,
                                        )}
                                    >
                                        {group.label}
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            × {group.entries.length}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'hidden py-2.5 text-right whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell',
                                            cellPadding,
                                        )}
                                    >
                                        {formatNpr(group.profit)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'py-2.5 text-right font-semibold whitespace-nowrap tabular-nums',
                                            cellPadding,
                                        )}
                                    >
                                        {formatNpr(group.tithe)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'py-2.5 text-right text-xs whitespace-nowrap text-muted-foreground',
                                            cellPadding,
                                        )}
                                    >
                                        {group.paidCount} of{' '}
                                        {group.entries.length} paid
                                    </TableCell>
                                </TableRow>
                                {group.entries.map((entry) => (
                                    <EntryRow
                                        key={entryKey(entry)}
                                        entry={entry}
                                        heading={null}
                                        isUpdating={
                                            isBusy &&
                                            processing.entryKey ===
                                                entryKey(entry)
                                        }
                                        isDisabled={isBusy}
                                        onToggle={() =>
                                            onToggleEntryStatus(tithe, entry)
                                        }
                                    />
                                ))}
                            </Fragment>
                        ),
                    )}
                    {tithe.entries.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={4}
                                className={cn(
                                    'h-16 text-center text-muted-foreground',
                                    cellPadding,
                                )}
                            >
                                Nothing contributed profit this month.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell
                            className={cn('py-3 font-semibold', cellPadding)}
                        >
                            Total tithe
                        </TableCell>
                        <TableCell
                            className={cn(
                                'hidden py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell',
                                cellPadding,
                            )}
                        >
                            {formatNpr(tithe.total_profit)}
                        </TableCell>
                        <TableCell
                            className={cn(
                                'py-3 text-right font-semibold whitespace-nowrap tabular-nums',
                                cellPadding,
                            )}
                        >
                            {formatNpr(tithe.total_amount)}
                        </TableCell>
                        <TableCell />
                    </TableRow>
                </TableFooter>
            </Table>
        </section>
    );
}

export default function AdminTithesIndex({
    tithes,
    years,
    filters,
}: {
    tithes: Tithe[];
    years: number[];
    filters: { year: number; search?: string };
}) {
    const [processing, setProcessing] = useState<Processing | null>(null);

    const handleYearChange = (year: string) => {
        const selected = Number(year);

        if (!year || selected === filters.year) {
            return;
        }

        router.visit(
            adminTithesIndex({
                query: {
                    year: selected,
                    ...(filters.search ? { search: filters.search } : {}),
                },
            }),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['tithes', 'years', 'filters'],
            },
        );
    };

    const handleToggleStatus = (tithe: Tithe) => {
        const isPaid = !tithe.is_paid;

        router.visit(toggleStatus(tithe.id), {
            preserveScroll: true,
            optimistic: (props) => ({
                tithes: applyPaid(
                    props.tithes as Tithe[],
                    tithe.id,
                    isPaid,
                    null,
                ),
            }),
            onStart: () => {
                setProcessing({ titheId: tithe.id, entryKey: null });
            },
            onError: () => {
                toast.error('Unable to update tithe status.');
            },
            onFinish: () => {
                setProcessing(null);
            },
        });
    };

    const handleToggleEntryStatus = (tithe: Tithe, entry: TitheEntry) => {
        const isPaid = !entry.is_paid;
        const key = entryKey(entry);

        const route =
            entry.source_type === 'order'
                ? toggleOrderStatus({
                      monthlyTithe: tithe.id,
                      order: entry.source_id,
                  })
                : toggleServiceStatus({
                      monthlyTithe: tithe.id,
                      serviceEngagement: entry.source_id,
                  });

        router.visit(route, {
            preserveScroll: true,
            optimistic: (props) => ({
                tithes: applyPaid(
                    props.tithes as Tithe[],
                    tithe.id,
                    isPaid,
                    key,
                ),
            }),
            onStart: () => {
                setProcessing({ titheId: tithe.id, entryKey: key });
            },
            onError: () => {
                toast.error(`Unable to update ${entry.reference} tithe.`);
            },
            onFinish: () => {
                setProcessing(null);
            },
        });
    };

    return (
        <>
            <SeoHead title="Tithes" />

            <PagePanel
                title="Tithes"
                description="Review monthly tithes owed on completed-order and offline service profit."
                variant="transparent"
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <SearchFilter
                            href={adminTithesIndex().url}
                            currentSearch={filters.search ?? ''}
                            placeholder="Search month, order or service..."
                            params={{ year: filters.year }}
                            only={['tithes', 'years', 'filters']}
                        />
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={String(filters.year)}
                            onValueChange={handleYearChange}
                            className="w-fit"
                        >
                            {years.map((year) => (
                                <ToggleGroupItem
                                    key={year}
                                    value={String(year)}
                                    aria-label={`Show ${year} tithes`}
                                >
                                    {year}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                }
            >
                {tithes.length === 0 ? (
                    filters.search ? (
                        <EmptySearch />
                    ) : (
                        <EmptyYear year={filters.year} />
                    )
                ) : (
                    <div className="flex flex-col gap-8">
                        <YearSummary year={filters.year} tithes={tithes} />

                        {tithes.map((tithe) => (
                            <MonthlyTitheSummary
                                key={tithe.id}
                                tithe={tithe}
                                processing={processing}
                                onToggleStatus={handleToggleStatus}
                                onToggleEntryStatus={handleToggleEntryStatus}
                            />
                        ))}
                    </div>
                )}
            </PagePanel>
        </>
    );
}

AdminTithesIndex.layout = {
    breadcrumbs: breadcrumbs,
};
