import { Link } from '@inertiajs/react';
import { 
    Eye, 
    Banknote, 
    TrendingUp, 
    HandHeart, 
    Clock, 
    Package, 
    ShoppingBag, 
    Loader, 
    Users 
} from 'lucide-react';
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
import { index as adminOrdersIndex } from '@/routes/admin/orders';
import { index as adminTithesIndex } from '@/routes/admin/tithes';


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
        total_tithes_collected_npr: number;
        pending_tithes_npr: number;
    };
}) {
    return (
        <>
            <SeoHead title="Admin Dashboard" />

            <PagePanel title="Admin Dashboard" variant="transparent">
                <div className="mb-6 grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-green-100 p-3 text-green-600 transition-colors duration-300 group-hover:bg-green-600 group-hover:text-white dark:bg-green-900/30 dark:text-green-400 dark:group-hover:bg-green-600 dark:group-hover:text-white">
                            <Banknote className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Total Sales (Completed)</div>
                        <div className="mt-2 text-2xl font-bold">
                            Rs. {stats.total_sales_npr.toLocaleString()}
                        </div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-blue-100 p-3 text-blue-600 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Total Profit</div>
                        <div className="mt-2 text-2xl font-bold">
                            Rs. {stats.total_profit_npr.toLocaleString()}
                        </div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-purple-100 p-3 text-purple-600 transition-colors duration-300 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-900/30 dark:text-purple-400 dark:group-hover:bg-purple-600 dark:group-hover:text-white">
                            <HandHeart className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Total Tithes Collected (All Time)</div>
                        <div className="mt-2 text-2xl font-bold">
                            Rs. {stats.total_tithes_collected_npr.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-amber-100 p-3 text-amber-600 transition-colors duration-300 group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-900/30 dark:text-amber-400 dark:group-hover:bg-amber-600 dark:group-hover:text-white">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Pending Tithes (Unpaid)</div>
                        <div className="mt-2 text-2xl font-bold">
                            Rs. {stats.pending_tithes_npr.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-indigo-100 p-3 text-indigo-600 transition-colors duration-300 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-900/30 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white">
                            <Package className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Total Orders</div>
                        <div className="mt-2 text-2xl font-bold">{stats.total_orders.toLocaleString()}</div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-teal-100 p-3 text-teal-600 transition-colors duration-300 group-hover:bg-teal-600 group-hover:text-white dark:bg-teal-900/30 dark:text-teal-400 dark:group-hover:bg-teal-600 dark:group-hover:text-white">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Today's Orders</div>
                        <div className="mt-2 text-2xl font-bold">{stats.todays_orders.toLocaleString()}</div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-rose-100 p-3 text-rose-600 transition-colors duration-300 group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-900/30 dark:text-rose-400 dark:group-hover:bg-rose-600 dark:group-hover:text-white">
                            <Loader className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
                        <div className="mt-2 text-2xl font-bold">{stats.pending_orders.toLocaleString()}</div>
                    </div>
                    <div className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-4 rounded-full bg-cyan-100 p-3 text-cyan-600 transition-colors duration-300 group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-900/30 dark:text-cyan-400 dark:group-hover:bg-cyan-600 dark:group-hover:text-white">
                            <Users className="h-6 w-6" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Total Users</div>
                        <div className="mt-2 text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
                    </div>
                </div>

                <div className="mt-8 mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Orders</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={adminTithesIndex()}>Manage Tithes</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={adminOrdersIndex()}>View All Orders</Link>
                        </Button>
                    </div>
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
