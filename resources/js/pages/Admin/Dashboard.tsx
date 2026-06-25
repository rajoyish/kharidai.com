import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
    status: string;
    created_at: string;
    user: {
        name: string;
        email: string;
    };
    payment_receipt: {
        status: string;
    } | null;
};

export default function Dashboard({
    recentOrders = [],
}: {
    recentOrders?: Order[];
}) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Admin Dashboard', href: '/admin' }]}>
            <Head title="Admin Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="flex h-full items-center justify-center">
                            <span className="text-muted-foreground">
                                Stats Card
                            </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="text-lg font-semibold">Recent Orders</h2>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/orders">View All Orders</Link>
                        </Button>
                    </div>
                    <div className="overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">Order #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Receipt</th>
                                    <th className="px-6 py-4 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {recentOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-muted/20"
                                    >
                                        <td className="px-6 py-4 font-medium text-primary">
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                            >
                                                {order.order_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">
                                                {order.user.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(
                                                order.created_at,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold">
                                            {order.currency === 'npr'
                                                ? 'Rs.'
                                                : '$'}{' '}
                                            {order.total_amount}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                                                    order.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : order.status ===
                                                            'delivering'
                                                          ? 'bg-blue-100 text-blue-800'
                                                          : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                            >
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.currency === 'npr' ? (
                                                order.payment_receipt ? (
                                                    <span
                                                        className={`rounded-md px-2 py-1 text-xs ${
                                                            order.payment_receipt
                                                                .status ===
                                                            'approved'
                                                                ? 'border border-green-200 bg-green-100/50 text-green-700'
                                                                : order
                                                                        .payment_receipt
                                                                        .status ===
                                                                    'rejected'
                                                                  ? 'border border-red-200 bg-red-100/50 text-red-700'
                                                                  : 'border border-amber-200 bg-amber-100/50 text-amber-700'
                                                        }`}
                                                    >
                                                        {
                                                            order.payment_receipt
                                                                .status
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        Missing
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-8 text-center text-muted-foreground"
                                        >
                                            No recent orders found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
