import { Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { destroy as destroyOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CopyableOrderNumber } from '@/components/copy-button';
import { PagePanel } from '@/components/page-panel';
import { SearchFilter } from '@/components/search-filter';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

type SortKey = 'customer' | 'date' | 'amount' | 'profit' | 'status';
type SortDirection = 'asc' | 'desc';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: dashboard().url },
    { title: 'Orders', href: adminOrdersIndex().url },
];

const RELOAD_ONLY = [
    'digitalOrders',
    'physicalOrders',
    'serviceOrders',
    'years',
    'filters',
];

/**
 * Compares two orders on the given column. Direction is applied by the caller,
 * so this always returns the ascending ordering.
 */
function compareOrders(a: Order, b: Order, key: SortKey): number {
    switch (key) {
        case 'customer':
            return a.user.name.localeCompare(b.user.name);
        case 'date':
            return (
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
        case 'amount':
            return Number(a.total_amount) - Number(b.total_amount);
        case 'profit':
            return (a.profit ?? 0) - (b.profit ?? 0);
        case 'status':
            return a.status.localeCompare(b.status);
    }
}

export default function AdminOrderIndex({
    physicalOrders,
    digitalOrders,
    serviceOrders,
    years,
    filters,
}: {
    physicalOrders: Order[];
    digitalOrders: Order[];
    serviceOrders: Order[];
    years: number[];
    filters: { year: number; search?: string };
}) {
    const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
    /**
     * The order awaiting delete confirmation. A single dialog is shared by all
     * three tables rather than rendering one per row.
     */
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const handleYearChange = (year: string) => {
        const selected = Number(year);

        if (!year || selected === filters.year) {
            return;
        }

        router.visit(
            adminOrdersIndex({
                query: {
                    year: selected,
                    ...(filters.search ? { search: filters.search } : {}),
                },
            }),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: RELOAD_ONLY,
            },
        );
    };

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
                <PagePanel
                    title="Digital Orders"
                    variant="transparent"
                    actions={
                        <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                            {/* One search box drives all three tables, since the
                                server filters every list by the same term. */}
                            <SearchFilter
                                href={adminOrdersIndex().url}
                                currentSearch={filters?.search ?? ''}
                                placeholder="Search order # or customer..."
                                params={{ year: filters.year }}
                                only={RELOAD_ONLY}
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
                                        aria-label={`Show ${year} orders`}
                                    >
                                        {year}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                    }
                >
                    <OrderTable
                        orders={digitalOrders}
                        deletingOrderId={deletingOrderId}
                        onRequestDelete={setOrderToDelete}
                    />
                </PagePanel>

                <PagePanel title="Physical Orders" variant="transparent">
                    <OrderTable
                        orders={physicalOrders}
                        deletingOrderId={deletingOrderId}
                        onRequestDelete={setOrderToDelete}
                    />
                </PagePanel>

                <PagePanel title="Service Orders" variant="transparent">
                    <OrderTable
                        orders={serviceOrders}
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

function SortableHead({
    label,
    sortKey,
    activeSort,
    direction,
    onSort,
    className,
}: {
    label: string;
    sortKey: SortKey;
    activeSort: SortKey | null;
    direction: SortDirection;
    onSort: (key: SortKey) => void;
    className?: string;
}) {
    const isActive = activeSort === sortKey;
    const Icon = !isActive
        ? ArrowUpDown
        : direction === 'asc'
          ? ArrowUp
          : ArrowDown;

    return (
        <TableHead className={className}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="inline-flex items-center gap-1 hover:text-foreground data-[active=true]:text-foreground"
                data-active={isActive}
                aria-label={`Sort by ${label}`}
            >
                {label}
                <Icon className="size-3.5 opacity-70" />
            </button>
        </TableHead>
    );
}

function OrderTable({
    orders,
    deletingOrderId,
    onRequestDelete,
}: {
    orders: Order[];
    deletingOrderId: number | null;
    onRequestDelete: (order: Order) => void;
}) {
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [direction, setDirection] = useState<SortDirection>('asc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));

            return;
        }

        setSortKey(key);
        setDirection('asc');
    };

    const sortedOrders = useMemo(() => {
        if (!sortKey) {
            return orders;
        }

        const factor = direction === 'asc' ? 1 : -1;

        return [...orders].sort(
            (a, b) => compareOrders(a, b, sortKey) * factor,
        );
    }, [orders, sortKey, direction]);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Order #</TableHead>
                    <SortableHead
                        label="Customer"
                        sortKey="customer"
                        activeSort={sortKey}
                        direction={direction}
                        onSort={handleSort}
                    />
                    <SortableHead
                        label="Date"
                        sortKey="date"
                        activeSort={sortKey}
                        direction={direction}
                        onSort={handleSort}
                    />
                    <SortableHead
                        label="Amount"
                        sortKey="amount"
                        activeSort={sortKey}
                        direction={direction}
                        onSort={handleSort}
                    />
                    <SortableHead
                        label="Profit"
                        sortKey="profit"
                        activeSort={sortKey}
                        direction={direction}
                        onSort={handleSort}
                    />
                    <SortableHead
                        label="Status"
                        sortKey="status"
                        activeSort={sortKey}
                        direction={direction}
                        onSort={handleSort}
                    />
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedOrders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium text-primary">
                            <CopyableOrderNumber
                                orderNumber={order.order_number}
                            >
                                <Link href={showAdminOrder(order.id)}>
                                    {order.order_number}
                                </Link>
                            </CopyableOrderNumber>
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
                {sortedOrders.length === 0 && (
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
