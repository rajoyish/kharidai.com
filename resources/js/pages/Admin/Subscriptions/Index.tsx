import { Link } from '@inertiajs/react';

import { CopyableOrderNumber } from '@/components/copy-button';
import { DaysLeft } from '@/components/days-left';
import { PagePanel } from '@/components/page-panel';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import { TruncatedText } from '@/components/truncated-text';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { WhatsappContactAction } from '@/components/whatsapp-contact-action';
import { dashboard } from '@/routes/admin';
import { show as showAdminOrder } from '@/routes/admin/orders';
import { index as adminSubscriptionsIndex } from '@/routes/admin/subscriptions';

type Subscription = {
    id: number;
    start_date: string;
    end_date: string | null;
    days_left: number | null;
    is_expired: boolean;
    user: {
        id: number;
        name: string;
        email: string;
        mobile_number: string | null;
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
    { title: 'Admin', href: dashboard().url },
    { title: 'Subscriptions', href: adminSubscriptionsIndex().url },
];

export default function AdminSubscriptionIndex({
    subscriptions,
    filters,
}: {
    subscriptions: { data: Subscription[] };
    filters: { search?: string };
}) {
    return (
        <>
            <SeoHead title="Subscriptions - Admin" />

            <PagePanel
                title="Subscriptions"
                variant="transparent"
                actions={
                    <SearchFilter
                        href={adminSubscriptionsIndex().url}
                        currentSearch={filters?.search ?? ''}
                        placeholder="Search order #, customer..."
                    />
                }
            >
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
                                <TableHead className="text-center">
                                    Contact
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.data.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {sub.user.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {sub.user.email}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {sub.order_item ? (
                                            <TruncatedText
                                                title={`${sub.order_item.product_variant.product.title} (${sub.order_item.product_variant.name})`}
                                                className="max-w-[200px] sm:max-w-[300px]"
                                            >
                                                {
                                                    sub.order_item
                                                        .product_variant.product
                                                        .title
                                                }{' '}
                                                (
                                                {
                                                    sub.order_item
                                                        .product_variant.name
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
                                        <CopyableOrderNumber
                                            orderNumber={sub.order.order_number}
                                        >
                                            <Link
                                                href={showAdminOrder(
                                                    sub.order.id,
                                                )}
                                                className="text-primary hover:underline"
                                            >
                                                {sub.order.order_number}
                                            </Link>
                                        </CopyableOrderNumber>
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
                                    <TableCell className="text-center">
                                        <WhatsappContactAction
                                            name={sub.user.name}
                                            mobileNumber={
                                                sub.user.mobile_number
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {subscriptions.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {filters?.search
                                            ? 'No subscriptions match your search.'
                                            : 'No subscriptions found.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </PagePanel>
        </>
    );
}

AdminSubscriptionIndex.layout = {
    breadcrumbs: breadcrumbs,
};
