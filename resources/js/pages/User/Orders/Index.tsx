import { Head, Link } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';

import { PagePanel } from '@/components/page-panel';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
    status: string;
    created_at: string;
    items: {
        id: number;
        quantity: number;
        product_variant: {
            name: string;
            product: {
                title: string;
            };
        };
    }[];
};

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Orders', href: '/orders' },
];

export default function OrderIndex({ orders }: { orders: { data: Order[] } }) {
    return (
        <>
            <Head title="My Orders" />

            <PagePanel title="My Orders">
                {orders.data.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        You have no orders yet.
                    </div>
                ) : (
                    <div className="divide-y">
                        {orders.data.map((order) => (
                            <div
                                key={order.id}
                                className="flex flex-col items-start justify-between gap-4 p-6 transition-colors hover:bg-muted/50 md:flex-row md:items-center"
                            >
                                <div>
                                    <Link
                                        href={`/orders/${order.id}`}
                                        className="text-lg font-semibold text-primary hover:underline"
                                    >
                                        {order.order_number}
                                    </Link>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {new Date(
                                            order.created_at,
                                        ).toLocaleDateString()}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                        {order.items.map((item) => (
                                            <span
                                                key={item.id}
                                                className="rounded-md bg-secondary px-2 py-1 text-xs"
                                            >
                                                {item.quantity}x{' '}
                                                {
                                                    item.product_variant
                                                        .product.title
                                                }{' '}
                                                ({item.product_variant.name}
                                                )
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 md:items-end">
                                    <div className="text-lg font-bold">
                                        {order.currency === 'npr'
                                            ? 'Rs.'
                                            : '$'}{' '}
                                        {order.total_amount}
                                    </div>
                                    <div>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                                order.status === 'completed'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : order.status ===
                                                        'delivering'
                                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }`}
                                        >
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PagePanel>
        </>
    );
}

OrderIndex.layout = {
    breadcrumbs: breadcrumbs,
};
