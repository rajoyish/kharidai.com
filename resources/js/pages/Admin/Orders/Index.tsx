import { Link, router, setLayoutProps } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { destroy as destroyOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CopyableOrderNumber } from '@/components/copy-button';
import { PagePanel } from '@/components/page-panel';
import { ProratedRefundBadge } from '@/components/prorated-refund-badge';
import type { OrderRefund } from '@/components/prorated-refund-badge';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import {
    ApprovalStatusBadge,
    OrderStatusBadge,
} from '@/components/status-badge';
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

type Order = OrderRefund & {
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

const RELOAD_ONLY = ['orders', 'years', 'filters'];

/**
 * Digital orders live at the bare `/admin/orders`, so their link carries no
 * type segment; the sidebar matches the same URL to highlight the page.
 */
function ordersUrlFor(type: string, query?: Record<string, string | number>) {
    return adminOrdersIndex(
        type === 'digital' ? undefined : { productType: type },
        {
            query,
        },
    ).url;
}

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
    orders,
    productType,
    years,
    filters,
}: {
    orders: Order[];
    productType: { value: string; label: string };
    years: number[];
    filters: { year: number; search?: string };
}) {
    setLayoutProps({
        breadcrumbs: [
            ...breadcrumbs,
            {
                title: productType.label,
                href: ordersUrlFor(productType.value),
            },
        ],
    });

    const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
    /**
     * The order awaiting delete confirmation. A single dialog is shared by
     * every row rather than rendering one per row.
     */
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const handleYearChange = (year: string) => {
        const selected = Number(year);

        if (!year || selected === filters.year) {
            return;
        }

        router.visit(
            ordersUrlFor(productType.value, {
                year: selected,
                ...(filters.search ? { search: filters.search } : {}),
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
            <SeoHead title={`${productType.label} Orders`} />

            <div className="space-y-8">
                <PagePanel
                    title={`${productType.label} Orders`}
                    variant="transparent"
                    actions={
                        <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                            <SearchFilter
                                href={ordersUrlFor(productType.value)}
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
                        orders={orders}
                        deletingOrderId={deletingOrderId}
                        onRequestDelete={setOrderToDelete}
                    />
                </PagePanel>
            </div>

            {orderToDelete && (
                <ConfirmDialog
                    title="Delete this order?"
                    description={
                        <>
                            Order {orderToDelete.order_number} placed by{' '}
                            {orderToDelete.user.name} moves to Orders › Deleted
                            and the customer no longer sees it, or any
                            subscription bought in it. You can restore it there.
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
                        <TableCell className="font-medium text-success">
                            {order.status === 'completed' ? (
                                <>{formatNpr(order.profit ?? 0)}</>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                                <OrderStatusBadge status={order.status} />
                                <ProratedRefundBadge order={order} />
                            </span>
                        </TableCell>
                        <TableCell>
                            {order.payment_receipt ? (
                                <ApprovalStatusBadge
                                    status={order.payment_receipt.status}
                                />
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
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
