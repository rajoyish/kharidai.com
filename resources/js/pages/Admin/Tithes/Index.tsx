import { Link, router } from '@inertiajs/react';
import { CalendarOff, Circle, CircleCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
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
        { label: `Total Tithe ${year}`, value: totals.payable },
        { label: 'Paid', value: totals.paid },
        { label: 'Outstanding', value: totals.outstanding },
    ];

    return (
        <dl className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                >
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {stat.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">
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

    return (
        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        {tithe.label} Tithe Summary
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className={statusClasses[tithe.payment_status]}
                        >
                            {statusLabels[tithe.payment_status]}
                        </Badge>
                        {tithe.payment_status === 'partial' && (
                            <span className="text-xs text-muted-foreground">
                                {formatNpr(tithe.paid_amount)} paid ·{' '}
                                {formatNpr(tithe.outstanding_amount)}{' '}
                                outstanding
                            </span>
                        )}
                        {tithe.payment_status === 'paid' && tithe.paid_at && (
                            <span className="text-xs text-muted-foreground">
                                Paid on{' '}
                                {new Date(tithe.paid_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
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

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">Tithe</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tithe.entries.map((entry) => (
                            <TableRow key={entryKey(entry)}>
                                <TableCell className="font-medium">
                                    {entry.label}
                                </TableCell>
                                <TableCell>
                                    <Link
                                        href={entryHref(entry)}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {entry.reference}
                                    </Link>
                                    {entry.source_type === 'service' && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            Offline
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNpr(entry.profit)}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600 tabular-nums dark:text-green-400">
                                    {formatNpr(entry.tithe)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <EntryStatusButton
                                        entry={entry}
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
                                </TableCell>
                            </TableRow>
                        ))}
                        {tithe.entries.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-16 text-center text-muted-foreground"
                                >
                                    Nothing contributed profit this month.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="font-bold" colSpan={3}>
                                Total Tithes Payable ({tithe.label})
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                                {formatNpr(tithe.total_amount)}
                            </TableCell>
                            <TableCell />
                        </TableRow>
                        {tithe.payment_status === 'partial' && (
                            <TableRow>
                                <TableCell
                                    className="font-medium text-muted-foreground"
                                    colSpan={3}
                                >
                                    Remaining Balance ({tithe.label})
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                    {formatNpr(tithe.outstanding_amount)}
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        )}
                    </TableFooter>
                </Table>
            </div>
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
                    <div className="flex flex-col gap-6">
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
