<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $recentOrders = Order::with(['user', 'paymentReceipt', 'items.serviceEngagements'])
            ->latest()
            ->take(5)
            ->get();

        // Sales and profit both hinge on per-item invoice data that SQL cannot sum
        // for us, so the orders are walked in chunks rather than hydrated all at
        // once — memory stays flat as the order history grows.
        $totalProfitNpr = 0.0;
        $totalSalesNpr = 0.0;

        Order::query()
            ->completed()
            ->with('items.serviceEngagements')
            ->lazy()
            ->each(function (Order $order) use (&$totalProfitNpr, &$totalSalesNpr): void {
                $totalProfitNpr += $order->profit;
                $totalSalesNpr += $order->displayTotalNpr();
            });

        $monthlyTithes = MonthlyTithe::query()->get();

        $stats = [
            'total_sales_npr' => round($totalSalesNpr, 2),
            'total_profit_npr' => round($totalProfitNpr, 2),
            'total_orders' => Order::count(),
            'todays_orders' => Order::whereDate('created_at', today())->count(),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'total_users' => User::count(),
            'total_tithes_collected_npr' => round($monthlyTithes
                ->filter(fn (MonthlyTithe $monthlyTithe): bool => $monthlyTithe->is_paid)
                ->sum(fn (MonthlyTithe $monthlyTithe): float => $monthlyTithe->total_amount), 2),
            'pending_tithes_npr' => round($monthlyTithes
                ->reject(fn (MonthlyTithe $monthlyTithe): bool => $monthlyTithe->is_paid)
                ->sum(fn (MonthlyTithe $monthlyTithe): float => $monthlyTithe->total_amount), 2),
        ];

        return Inertia::render('Admin/Dashboard', [
            'recentOrders' => $recentOrders,
            'stats' => $stats,
        ]);
    }
}
