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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dashboard } from '@/routes/admin';
import {
    index as adminTithesIndex,
    toggleStatus,
} from '@/routes/admin/tithes';

type Tithe = {
    id: number;
    month: number;
    year: number;
    label: string;
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Month / Year</TableHead>
                            <TableHead>Total Profit</TableHead>
                            <TableHead>Tithe Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tithes.map((tithe) => {
                            const isUpdating = processingId === tithe.id;

                            return (
                                <TableRow key={tithe.id}>
                                    <TableCell className="font-medium">
                                        {tithe.label}
                                    </TableCell>
                                    <TableCell>{formatMoney(tithe.total_profit)}</TableCell>
                                    <TableCell className="font-semibold text-green-600 dark:text-green-400">
                                        {formatMoney(tithe.total_amount)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span
                                                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    tithe.is_paid
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-amber-100 text-amber-800'
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
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant={tithe.is_paid ? 'outline' : 'default'}
                                            size="sm"
                                            disabled={processingId !== null}
                                            onClick={() => handleToggleStatus(tithe)}
                                        >
                                            {isUpdating
                                                ? 'Updating...'
                                                : tithe.is_paid
                                                  ? 'Mark Unpaid'
                                                  : 'Mark Paid'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {tithes.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No monthly tithes have been calculated yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

AdminTithesIndex.layout = {
    breadcrumbs: breadcrumbs,
};
