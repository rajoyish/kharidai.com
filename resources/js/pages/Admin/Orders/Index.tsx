import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { PagePanel } from '@/components/page-panel';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
    status: string;
    profit: number;
    created_at: string;
    user: {
        name: string;
        email: string;
    };
    payment_receipt: {
        status: string;
    } | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: '/admin' },
    { title: 'Orders', href: '/admin/orders' },
];

export default function AdminOrderIndex({
    orders,
}: {
    orders: { data: Order[] };
}) {
    return (
        <>
            <Head title="Manage Orders" />

            <PagePanel title="Manage Orders" variant="transparent">

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Profit</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.data.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium text-primary">
                                    <Link
                                        href={`/admin/orders/${order.id}`}
                                    >
                                        {order.order_number}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">
                                        {order.user.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {order.user.email}
                                    </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {new Date(
                                        order.created_at,
                                    ).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-bold">
                                    {order.currency === 'npr' ? 'Rs.' : '$'}{' '}
                                    {order.total_amount}
                                </TableCell>
                                <TableCell className="font-medium text-green-600">
                                    {order.status === 'completed' ? (
                                        <>{order.currency === 'npr' ? 'Rs.' : '$'} {order.profit.toFixed(2)}</>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                                            order.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : order.status ===
                                                    'delivering'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                    >
                                        {order.status}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {order.currency === 'npr' ? (
                                        order.payment_receipt ? (
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs ${
                                                    order.payment_receipt
                                                        .status ===
                                                    'approved'
                                                        ? 'border border-green-200 bg-green-100/50 text-green-700'
                                                        : order
                                                                .payment_receipt
                                                                .status ===
                                                            'rejected'
                                                          ? 'border border-red-200 bg-red-100/50 text-red-700'
                                                          : 'border border-amber-200 bg-amber-100/50 text-amber-700'
                                                }`}
                                            >
                                                {
                                                    order.payment_receipt
                                                        .status
                                                }
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">
                                                Missing
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                    >
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this order?')) {
                                                router.delete(`/admin/orders/${order.id}`);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.data.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

AdminOrderIndex.layout = {
    breadcrumbs: breadcrumbs,
};
