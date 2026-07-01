import { Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
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

export default function Dashboard({
    recentOrders = [],
    stats,
}: {
    recentOrders?: Order[];
    stats: {
        total_sales_npr: number;
        total_profit_npr: number;
        total_orders: number;
        todays_orders: number;
        pending_orders: number;
        total_users: number;
    };
}) {
    return (
        <>
            <SeoHead title="Admin Dashboard" />

            <PagePanel title="Admin Dashboard" variant="transparent">
                <div className="mb-6 grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Total Sales (Completed)</div>
                        <div className="mt-2 text-2xl font-bold">
                            <div>Rs. {stats.total_sales_npr.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Total Profit</div>
                        <div className="mt-2 text-2xl font-bold">
                            <div>Rs. {stats.total_profit_npr.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Total Orders</div>
                        <div className="mt-2 text-2xl font-bold">{stats.total_orders.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Today's Orders</div>
                        <div className="mt-2 text-2xl font-bold">{stats.todays_orders.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
                        <div className="mt-2 text-2xl font-bold">{stats.pending_orders.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Total Users</div>
                        <div className="mt-2 text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
                    </div>
                </div>

                <div className="mt-8 mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Orders</h2>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/orders">View All Orders</Link>
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Profit</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium text-primary">
                                    <Link href={`/admin/orders/${order.id}`}>
                                        {order.order_number}
                                    </Link>
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
                                    Rs. {order.total_amount}
                                </TableCell>
                                <TableCell className="font-medium text-green-600">
                                    {order.status === 'completed' ? (
                                        <>Rs. {order.profit.toFixed(0)}</>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                                            order.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : order.status === 'delivering'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                    >
                                        {order.status}
                                    </span>
                                </TableCell>
                                <TableCell>
                                        {order.payment_receipt ? (
                                            <span
                                                className={`rounded-md px-2 py-1 text-xs ${
                                                    order.payment_receipt.status === 'approved'
                                                        ? 'border border-green-200 bg-green-100/50 text-green-700'
                                                        : order.payment_receipt.status === 'rejected'
                                                          ? 'border border-red-200 bg-red-100/50 text-red-700'
                                                          : 'border border-amber-200 bg-amber-100/50 text-amber-700'
                                                }`}
                                            >
                                                {order.payment_receipt.status}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">
                                                Missing
                                            </span>
                                        )}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/admin/orders/${order.id}`}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {recentOrders.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No recent orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Admin Dashboard', href: '/admin' }],
};
