import { Link, router } from '@inertiajs/react';
import { Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { destroy as destroyOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { formatNpr } from '@/lib/currency';
import { dashboard } from '@/routes/admin';
import {
    index as adminOrdersIndex,
    show as showAdminOrder,
} from '@/routes/admin/orders';
import type { BreadcrumbItem } from '@/types';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
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
    { title: 'Admin Dashboard', href: dashboard().url },
    { title: 'Orders', href: adminOrdersIndex().url },
];

export default function AdminOrderIndex({
    physicalOrders,
    digitalOrders,
    serviceOrders,
}: {
    physicalOrders: { data: Order[] };
    digitalOrders: { data: Order[] };
    serviceOrders: { data: Order[] };
}) {
    const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
    /**
     * The order awaiting delete confirmation. A single dialog is shared by all
     * three tables rather than rendering one per row.
     */
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const handleDelete = (order: Order) => {
        setDeletingOrderId(order.id);

        router.delete(destroyOrder(order), {
            preserveScroll: true,
            onFinish: () => {
                setDeletingOrderId(null);
            },
        });
    };

    return (
        <>
            <SeoHead title="Manage Orders" />

            <div className="space-y-8">
                <PagePanel title="Digital Orders" variant="transparent">
                    <OrderTable
                        orders={digitalOrders.data}
                        deletingOrderId={deletingOrderId}
                        onRequestDelete={setOrderToDelete}
                    />
                </PagePanel>

                <PagePanel title="Physical Orders" variant="transparent">
                    <OrderTable
                        orders={physicalOrders.data}
                        deletingOrderId={deletingOrderId}
                        onRequestDelete={setOrderToDelete}
                    />
                </PagePanel>

                <PagePanel title="Service Orders" variant="transparent">
                    <OrderTable
                        orders={serviceOrders.data}
                        deletingOrderId={deletingOrderId}
                        onRequestDelete={setOrderToDelete}
                    />
                </PagePanel>
            </div>

            {orderToDelete && (
                <ConfirmDialog
                    title="Are you sure you want to delete this order?"
                    description={
                        <>
                            This permanently removes order{' '}
                            {orderToDelete.order_number} placed by{' '}
                            {orderToDelete.user.name}, along with its shipment
                            and any subscription bought in it. This cannot be
                            undone.
                        </>
                    }
                    onConfirm={() => handleDelete(orderToDelete)}
                    onOpenChange={() => setOrderToDelete(null)}
                />
            )}
        </>
    );
}

AdminOrderIndex.layout = {
    breadcrumbs: breadcrumbs,
};

function OrderTable({
    orders,
    deletingOrderId,
    onRequestDelete,
}: {
    orders: Order[];
    deletingOrderId: number | null;
    onRequestDelete: (order: Order) => void;
}) {
    return (
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
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium text-primary">
                            <Link href={showAdminOrder(order.id)}>
                                {order.order_number}
                            </Link>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{order.user.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {order.user.email}
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-bold">
                            {formatNpr(order.total_amount)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                            {order.status === 'completed' ? (
                                <>{formatNpr(order.profit ?? 0)}</>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                                    order.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : order.status === 'delivering'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                                {order.status}
                            </span>
                        </TableCell>
                        <TableCell>
                            {order.payment_receipt ? (
                                <span
                                    className={`rounded-md px-2 py-1 text-xs ${
                                        order.payment_receipt.status ===
                                        'approved'
                                            ? 'border border-green-200 bg-green-100/50 text-green-700'
                                            : order.payment_receipt.status ===
                                                'rejected'
                                              ? 'border border-red-200 bg-red-100/50 text-red-700'
                                              : 'border border-amber-200 bg-amber-100/50 text-amber-700'
                                    }`}
                                >
                                    {order.payment_receipt.status}
                                </span>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">
                                    Missing
                                </span>
                            )}
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={showAdminOrder(order.id)}>
                                    <Eye className="h-4 w-4" />
                                    View
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                disabled={deletingOrderId === order.id}
                                onClick={() => onRequestDelete(order)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {orders.length === 0 && (
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
    );
}
