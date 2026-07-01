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
        $recentOrders = Order::with(['user', 'paymentReceipt', 'items'])
            ->latest()
            ->take(5)
            ->get();

        $completedOrdersNpr = Order::query()
            ->completed()
            ->with('items')
            ->get();

        $totalProfitNpr = $completedOrdersNpr->sum(function ($order) {
            return $order->items->sum(function ($item) {
                return ($item->price - $item->purchase_price) * $item->quantity;
            });
        });

        $monthlyTithes = MonthlyTithe::query()->get();

        $stats = [
            'total_sales_npr' => $completedOrdersNpr->sum('total_amount'),
            'total_profit_npr' => $totalProfitNpr,
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
