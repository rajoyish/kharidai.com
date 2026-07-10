import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
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
    { title: 'Admin Dashboard', href: dashboard() },
    { title: 'Tithes', href: adminTithesIndex() },
];

const formatMoney = (amount: number): string =>
    `Rs. ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

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
                        <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                tithe.is_paid
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                        >
                            {tithe.is_paid ? 'Paid' : 'Unpaid'}
                        </span>
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
                                <TableCell className="text-right">
                                    {formatMoney(product.profit)}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                    {formatMoney(product.tithe)}
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
                            <TableCell className="text-right font-bold">
                                {formatMoney(tithe.total_amount)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </section>
    );
}

export default function AdminTithesIndex({ tithes }: { tithes: Tithe[] }) {
    const [processingId, setProcessingId] = useState<number | null>(null);

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

            <PagePanel title="Tithes" variant="transparent">
                {tithes.length === 0 ? (
                    <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground shadow-sm">
                        No monthly tithes have been calculated yet.
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
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
