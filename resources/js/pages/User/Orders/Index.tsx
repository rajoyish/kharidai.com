import { Link } from '@inertiajs/react';

import { Eye, MessageCircle, Upload } from 'lucide-react';
import { CopyableOrderNumber } from '@/components/copy-button';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { OrderStatusBadge } from '@/components/status-badge';
import { TruncatedText } from '@/components/truncated-text';
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
import { home } from '@/routes';
import { index as ordersIndex, show as showOrder } from '@/routes/orders';

type Order = {
    id: number;
    order_number: string;
    /** Invoice-aware total: service invoices supersede checkout estimates. */
    display_total_npr: number;
    status: string;
    created_at: string;
    can_reupload_receipt: boolean;
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
    shipment: {
        status: string;
    } | null;
};

const breadcrumbs = [
    { title: 'Home', href: home() },
    { title: 'My Orders', href: ordersIndex() },
];

export default function OrderIndex({ orders }: { orders: { data: Order[] } }) {
    return (
        <>
            <SeoHead title="My Orders" />

            <PagePanel title="My Orders" variant="transparent">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Shipment</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.data.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium text-primary">
                                    <CopyableOrderNumber
                                        orderNumber={order.order_number}
                                    >
                                        <Link href={showOrder(order.id)}>
                                            {order.order_number}
                                        </Link>
                                    </CopyableOrderNumber>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {new Date(
                                        order.created_at,
                                    ).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {order.items.map((item) => {
                                            const text = `${item.quantity}x ${item.product_variant.product.title} (${item.product_variant.name})`;

                                            return (
                                                <TruncatedText
                                                    key={item.id}
                                                    title={text}
                                                    className="inline-block max-w-[200px] rounded bg-secondary px-1.5 py-0.5 align-bottom text-xs text-secondary-foreground sm:max-w-[300px]"
                                                >
                                                    {text}
                                                </TruncatedText>
                                            );
                                        })}
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold whitespace-nowrap">
                                    {formatNpr(order.display_total_npr)}
                                </TableCell>
                                <TableCell>
                                    <OrderStatusBadge status={order.status} />
                                </TableCell>
                                <TableCell>
                                    {order.shipment ? (
                                        <OrderStatusBadge
                                            status={order.shipment.status}
                                        />
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            -
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    {(order.can_reupload_receipt ||
                                        order.status === 'pending') && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-900 focus-visible:ring-amber-500 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
                                        >
                                            <Link href={showOrder(order.id)}>
                                                <Upload className="mr-1 h-4 w-4" />{' '}
                                                Reupload Receipt
                                            </Link>
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={showOrder(order.id)}>
                                            <Eye className="h-4 w-4" />
                                            View
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={`${showOrder(order.id)}#chat`}
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Support
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.data.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    You have no orders yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

OrderIndex.layout = {
    breadcrumbs: breadcrumbs,
};
