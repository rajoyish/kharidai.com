import { Head, Link } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { PagePanel } from '@/components/page-panel';
import type { PaginatedData } from '@/types';

type Subscription = {
    id: number;
    start_date: string;
    end_date: string | null;
    days_left: number | null;
    user: {
        id: number;
        name: string;
        email: string;
    };
    order: {
        id: number;
        order_number: string;
    };
    order_item: {
        id: number;
        quantity: number;
        product_variant: {
            name: string;
            product: {
                title: string;
            };
        };
    } | null;
};

const breadcrumbs = [
    { title: 'Admin', href: '/admin' },
    { title: 'Subscriptions', href: '/admin/subscriptions' },
];

export default function AdminSubscriptionIndex({ subscriptions }: { subscriptions: PaginatedData<Subscription> }) {
    return (
        <>
            <Head title="Subscriptions - Admin" />

            <PagePanel title="Subscriptions" variant="transparent">
                {subscriptions.data.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No subscriptions found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Days Left</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscriptions.data.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div className="font-medium">{sub.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{sub.user.email}</div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {sub.order_item ? (
                                                <span>
                                                    {sub.order_item.product_variant.product.title} ({sub.order_item.product_variant.name})
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">N/A</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/admin/orders/${sub.order.id}`} className="text-primary hover:underline">
                                                {sub.order.order_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {sub.start_date}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {sub.end_date || 'Lifetime'}
                                        </TableCell>
                                        <TableCell>
                                            {sub.days_left !== null ? (
                                                <span className={`font-bold ${sub.days_left <= 5 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                                                    {sub.days_left}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </PagePanel>
        </>
    );
}

AdminSubscriptionIndex.layout = {
    breadcrumbs: breadcrumbs,
};
