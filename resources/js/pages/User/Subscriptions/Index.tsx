import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

import { DaysLeft } from '@/components/days-left';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { TruncatedText } from '@/components/truncated-text';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { home } from '@/routes';
import { show as showOrder } from '@/routes/orders';
import { index as subscriptionsIndex, update } from '@/routes/subscriptions';

type Subscription = {
    id: number;
    start_date: string;
    end_date: string | null;
    days_left: number | null;
    is_expired: boolean;
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
    { title: 'Home', href: home() },
    { title: 'My Subscriptions', href: subscriptionsIndex() },
];

function EditableLabel({ subscription }: { subscription: Subscription }) {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(subscription.user_label || '');

    const handleBlur = () => {
        setIsEditing(false);

        if (label !== (subscription.user_label || '')) {
            router.put(
                update.url(subscription),
                {
                    user_label: label,
                },
                { preserveScroll: true, preserveState: true },
            );
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (isEditing) {
        return (
            <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="Add label (e.g. Personal)"
                className="h-8 max-w-50"
            />
        );
    }

    if (!subscription.user_label) {
        return (
            <Badge
                variant="secondary"
                className="cursor-pointer font-normal opacity-70 hover:bg-secondary/80"
                onClick={() => setIsEditing(true)}
            >
                + Add label
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={() => setIsEditing(true)}
        >
            {subscription.user_label}
        </Badge>
    );
}

export default function SubscriptionIndex({
    subscriptions,
}: {
    subscriptions: Subscription[];
}) {
    return (
        <>
            <SeoHead title="My Subscriptions" />

            <PagePanel title="My Subscriptions" variant="transparent">
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
                                        <TruncatedText
                                            title={`${sub.order_item.product_variant.product.title} (${sub.order_item.product_variant.name})`}
                                            className="max-w-[200px] sm:max-w-[300px]"
                                        >
                                            {
                                                sub.order_item.product_variant
                                                    .product.title
                                            }{' '}
                                            (
                                            {
                                                sub.order_item.product_variant
                                                    .name
                                            }
                                            )
                                        </TruncatedText>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            N/A
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Link
                                        href={showOrder(sub.order.id)}
                                        className="text-primary hover:underline"
                                    >
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
                                    <DaysLeft
                                        startDate={sub.start_date}
                                        endDate={sub.end_date}
                                        initialDaysLeft={sub.days_left}
                                        isExpired={sub.is_expired}
                                    />
                                </TableCell>
                                <TableCell>
                                    <EditableLabel subscription={sub} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {subscriptions.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    You have no subscriptions yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

SubscriptionIndex.layout = {
    breadcrumbs: breadcrumbs,
};
