import { router } from '@inertiajs/react';
import { CalendarOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PagePanel } from '@/components/page-panel';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { dashboard } from '@/routes/admin';
import { index as adminTithesIndex, toggleStatus } from '@/routes/admin/tithes';

type TitheProduct = {
    product_id: number | null;
    name: string;
    type: string;
    profit: number;
    tithe: number;
};

type Tithe = {
    id: number;
    month: number;
    year: number;
    label: string;
    products: TitheProduct[];
    total_amount: number;
    total_profit: number;
    is_paid: boolean;
    paid_at: string | null;
};

const breadcrumbs = [
    { title: 'Admin Dashboard', href: dashboard().url },
    { title: 'Tithes', href: adminTithesIndex().url },
];

function YearSummary({ year, tithes }: { year: number; tithes: Tithe[] }) {
    const totals = useMemo(() => {
        return tithes.reduce(
            (carry, tithe) => ({
                payable: carry.payable + tithe.total_amount,
                paid: carry.paid + (tithe.is_paid ? tithe.total_amount : 0),
                outstanding:
                    carry.outstanding +
                    (tithe.is_paid ? 0 : tithe.total_amount),
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
                No month or product in this year matches your search. Clear it
                to see every tithe again.
            </p>
        </div>
    );
}

function MonthlyTitheSummary({
    tithe,
    isUpdating,
    isDisabled,
    onToggleStatus,
}: {
    tithe: Tithe;
    isUpdating: boolean;
    isDisabled: boolean;
    onToggleStatus: (tithe: Tithe) => void;
}) {
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
                            className={
                                tithe.is_paid
                                    ? 'border-transparent bg-success-surface text-success'
                                    : 'border-transparent bg-warning-surface text-warning'
                            }
                        >
                            {tithe.is_paid ? 'Paid' : 'Unpaid'}
                        </Badge>
                        {tithe.paid_at && (
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
                    disabled={isDisabled}
                    onClick={() => onToggleStatus(tithe)}
                >
                    {isUpdating
                        ? 'Updating...'
                        : tithe.is_paid
                          ? 'Mark Unpaid'
                          : 'Mark Paid'}
                </Button>
            </header>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">Tithe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tithe.products.map((product) => (
                            <TableRow
                                key={`${tithe.id}-${product.product_id ?? product.name}`}
                            >
                                <TableCell className="font-medium">
                                    {product.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNpr(product.profit)}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600 tabular-nums dark:text-green-400">
                                    {formatNpr(product.tithe)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {tithe.products.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="h-16 text-center text-muted-foreground"
                                >
                                    No completed orders contributed profit this
                                    month.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="font-bold">
                                Total Tithes Payable ({tithe.label})
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right font-bold tabular-nums">
                                {formatNpr(tithe.total_amount)}
                            </TableCell>
                        </TableRow>
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
    const [processingId, setProcessingId] = useState<number | null>(null);

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
        router.visit(toggleStatus(tithe.id), {
            preserveScroll: true,
            onStart: () => {
                setProcessingId(tithe.id);
            },
            onError: () => {
                toast.error('Unable to update tithe status.');
            },
            onFinish: () => {
                setProcessingId(null);
            },
        });
    };

    return (
        <>
            <SeoHead title="Tithes" />

            <PagePanel
                title="Tithes"
                description="Review monthly tithes owed on completed-order profit."
                variant="transparent"
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <SearchFilter
                            href={adminTithesIndex().url}
                            currentSearch={filters.search ?? ''}
                            placeholder="Search month or product..."
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
                                isUpdating={processingId === tithe.id}
                                isDisabled={processingId !== null}
                                onToggleStatus={handleToggleStatus}
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
