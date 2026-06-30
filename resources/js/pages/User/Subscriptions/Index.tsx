import { Head, Link, router } from '@inertiajs/react';
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
import { Input } from '@/components/ui/input';
import { useState } from 'react';

type Subscription = {
    id: number;
    start_date: string;
    end_date: string | null;
    days_left: number | null;
    user_label: string | null;
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
    { title: 'Home', href: '/' },
    { title: 'My Subscriptions', href: '/subscriptions' },
];

function EditableLabel({ subscription }: { subscription: Subscription }) {
    const [label, setLabel] = useState(subscription.user_label || '');

    const handleBlur = () => {
        if (label !== (subscription.user_label || '')) {
            router.put(`/subscriptions/${subscription.id}`, {
                user_label: label,
            }, { preserveScroll: true, preserveState: true });
        }
    };

    return (
        <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            placeholder="Add label (e.g. Personal)"
            className="h-8 max-w-[200px]"
        />
    );
}

export default function SubscriptionIndex({ subscriptions }: { subscriptions: Subscription[] }) {
    return (
        <>
            <Head title="My Subscriptions" />

            <PagePanel title="My Subscriptions" variant="transparent">
                {subscriptions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        You have no subscriptions yet.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Order #</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Days Left</TableHead>
                                <TableHead>Label (Private)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.map((sub) => (
                                <TableRow key={sub.id}>
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
                                        <Link href={`/orders/${sub.order.id}`} className="text-primary hover:underline">
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
                                    <TableCell>
                                        <EditableLabel subscription={sub} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </PagePanel>
        </>
    );
}

SubscriptionIndex.layout = {
    breadcrumbs: breadcrumbs,
};
