import { Link, router } from '@inertiajs/react';
import {
    ArchiveRestore,
    Boxes,
    EllipsisVertical,
    MonitorSmartphone,
    Package,
    RotateCcw,
    Trash2,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

import {
    deleted as deletedOrdersIndex,
    forceDestroy as forceDestroyOrder,
    index as ordersIndex,
    restore as restoreOrder,
} from '@/actions/App/Http/Controllers/Admin/OrderController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { PaginationLinks } from '@/components/pagination-links';
import type { PaginationLink } from '@/components/pagination-links';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import { OrderStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatNpr } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';

type DeletedOrder = {
    id: number;
    order_number: string;
    status: string;
    total_amount: number;
    customer: { name: string; email: string } | null;
    products: string[];
    types: { value: string; label: string }[];
    placed_on: string | null;
    deleted_ago: string | null;
    deleted_at: string | null;
};

type Paginator<T> = {
    data: T[];
    total: number;
    links: PaginationLink[];
};

/** The same icons the sidebar uses for each order list. */
const TYPE_ICONS: Record<string, LucideIcon> = {
    digital: MonitorSmartphone,
    physical: Boxes,
    service: Wrench,
};

/**
 * One column template shared by the header and every row, so they line up on
 * desktop. Every column has a fixed or fractional width: an `auto` actions
 * column would size to the buttons in a row but to nothing in the header,
 * shifting every column between them. Below `md` each row stacks into a card and the header is hidden.
 */
const ROW_GRID =
    'md:grid md:grid-cols-[minmax(0,1.5fr)_6.5rem_minmax(0,1.2fr)_6.5rem_8.5rem_9rem] md:items-center md:gap-6';

export default function DeletedOrders({
    orders,
    filters,
}: {
    orders: Paginator<DeletedOrder>;
    filters: { search: string };
}) {
    const [restoringId, setRestoringId] = useState<number | null>(null);
    /** The order awaiting confirmation before it is erased for good. */
    const [orderToErase, setOrderToErase] = useState<DeletedOrder | null>(null);

    const restore = (order: DeletedOrder) => {
        setRestoringId(order.id);

        router.patch(
            restoreOrder.url(order.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setRestoringId(null),
            },
        );
    };

    const isSearching = filters.search !== '';

    return (
        <>
            <SeoHead title="Deleted Orders" />

            <PagePanel
                title="Deleted orders"
                description="Hidden from customers, along with any subscription bought in them. Restoring brings an order back exactly as it was."
                variant="transparent"
                actions={
                    <SearchFilter
                        href={deletedOrdersIndex.url()}
                        currentSearch={filters.search}
                        placeholder="Search order # or customer..."
                        only={['orders', 'filters']}
                    />
                }
            >
                {orders.data.length === 0 ? (
                    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card p-12 text-center shadow-sm">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <ArchiveRestore className="size-5" />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold">
                            {isSearching
                                ? 'No deleted orders match'
                                : 'No deleted orders'}
                        </h2>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            {isSearching
                                ? `Nothing deleted matches "${filters.search}".`
                                : 'Orders you delete wait here, recoverable, until you restore them or delete them permanently.'}
                        </p>
                        <Button asChild variant="outline" className="mt-6">
                            <Link href={ordersIndex.url()}>Back to orders</Link>
                        </Button>
                    </div>
                ) : (
                    <section className="flex flex-col gap-3">
                        <p className="text-xs text-muted-foreground">
                            {orders.total}{' '}
                            {orders.total === 1 ? 'order' : 'orders'} deleted
                            {isSearching && ` matching "${filters.search}"`}
                        </p>

                        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                            <div
                                className={cn(
                                    'hidden border-b bg-muted/40 px-5 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid',
                                    ROW_GRID,
                                )}
                            >
                                <span>Order</span>
                                <span>Type</span>
                                <span>Customer</span>
                                <span className="text-right">Amount</span>
                                <span>Deleted</span>
                                <span>
                                    <span className="sr-only">Actions</span>
                                </span>
                            </div>

                            <ul className="divide-y">
                                {orders.data.map((order) => (
                                    <li
                                        key={order.id}
                                        className={cn(
                                            'flex flex-col gap-3 px-5 py-4',
                                            ROW_GRID,
                                        )}
                                        data-test="deleted-order"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-sm font-semibold">
                                                    {order.order_number}
                                                </span>
                                                <OrderStatusBadge
                                                    status={order.status}
                                                />
                                            </div>
                                            <p
                                                className="mt-1 truncate text-xs text-muted-foreground"
                                                title={order.products.join(
                                                    ', ',
                                                )}
                                            >
                                                {order.products.length > 0
                                                    ? order.products.join(', ')
                                                    : 'No items'}
                                                {order.placed_on &&
                                                    ` · placed ${order.placed_on}`}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {order.types.length > 0 ? (
                                                order.types.map((type) => {
                                                    const TypeIcon =
                                                        TYPE_ICONS[
                                                            type.value
                                                        ] ?? Package;

                                                    return (
                                                        <Badge
                                                            key={type.value}
                                                            variant="outline"
                                                            className="gap-1 font-normal text-muted-foreground"
                                                        >
                                                            <TypeIcon className="size-3" />
                                                            {type.label}
                                                        </Badge>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 text-sm">
                                            <p className="truncate font-medium">
                                                {order.customer?.name ??
                                                    'Deleted user'}
                                            </p>
                                            {order.customer && (
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {order.customer.email}
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-sm font-semibold tabular-nums md:text-right">
                                            <span className="mr-1 font-normal text-muted-foreground md:hidden">
                                                Amount
                                            </span>
                                            {formatNpr(order.total_amount)}
                                        </p>

                                        <p
                                            className="text-sm text-muted-foreground"
                                            title={
                                                order.deleted_at ?? undefined
                                            }
                                        >
                                            <span className="md:hidden">
                                                Deleted{' '}
                                            </span>
                                            {order.deleted_ago}
                                        </p>

                                        <div className="flex items-center gap-2 md:justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 md:flex-none"
                                                disabled={
                                                    restoringId === order.id
                                                }
                                                onClick={() => restore(order)}
                                            >
                                                <RotateCcw className="size-4" />
                                                Restore
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        aria-label={`More actions for ${order.order_number}`}
                                                    >
                                                        <EllipsisVertical className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onSelect={() =>
                                                            setOrderToErase(
                                                                order,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 />
                                                        Delete permanently
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <PaginationLinks
                            links={orders.links}
                            label="Deleted order pages"
                        />
                    </section>
                )}
            </PagePanel>

            {orderToErase && (
                <ConfirmDialog
                    title="Permanently delete this order?"
                    description={
                        <>
                            This erases order {orderToErase.order_number} along
                            with its items, receipts, messages, shipment and any
                            subscription bought in it. This cannot be undone.
                        </>
                    }
                    confirmLabel="Delete permanently"
                    onConfirm={() =>
                        router.delete(forceDestroyOrder.url(orderToErase.id), {
                            preserveScroll: true,
                        })
                    }
                    onOpenChange={() => setOrderToErase(null)}
                />
            )}
        </>
    );
}

DeletedOrders.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard().url },
        { title: 'Orders', href: ordersIndex().url },
        { title: 'Deleted', href: deletedOrdersIndex().url },
    ],
};
