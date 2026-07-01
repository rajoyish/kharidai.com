import { Link } from '@inertiajs/react';

import { Eye, MessageCircle, Upload } from 'lucide-react';
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



type Order = {
    id: number;
    order_number: string;
    total_amount: string;
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
};

const breadcrumbs = [
    { title: 'Home', href: '/' },
    { title: 'My Orders', href: '/orders' },
];

export default function OrderIndex({ orders }: { orders: { data: Order[] } }) {
    return (
        <>
            <SeoHead title="My Orders" />

            <PagePanel title="My Orders" variant="transparent">
                {orders.data.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        You have no orders yet.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="min-w-[250px] w-1/3">Items</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.data.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium text-primary">
                                        <Link href={`/orders/${order.id}`}>
                                            {order.order_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {order.items.map((item) => (
                                                <span
                                                    key={item.id}
                                                    className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                                                >
                                                    {item.quantity}x {item.product_variant.product.title} ({item.product_variant.name})
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold whitespace-nowrap">
                                        Rs. {order.total_amount}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                                                order.status === 'completed'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : order.status === 'delivering'
                                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }`}
                                        >
                                            {order.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex justify-end gap-2">
                                        {(order.can_reupload_receipt || order.status === 'pending') && (
                                            <Button variant="outline" size="sm" asChild className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-900 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50 dark:hover:text-amber-300 focus-visible:ring-amber-500">
                                                <Link href={`/orders/${order.id}`}>
                                                    <Upload className="h-4 w-4 mr-1" /> Reupload Receipt
                                                </Link>
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/orders/${order.id}`}>
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/orders/${order.id}#chat`}>
                                                <MessageCircle className="h-4 w-4" />
                                                Support
                                            </Link>
                                        </Button>
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

OrderIndex.layout = {
    breadcrumbs: breadcrumbs,
};
