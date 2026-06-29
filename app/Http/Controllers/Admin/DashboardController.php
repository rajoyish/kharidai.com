<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $recentOrders = Order::with(['user', 'paymentReceipt', 'items'])
            ->latest()
            ->take(5)
            ->get();

        $completedOrdersNpr = Order::where('status', 'completed')->with('items')->get();

        $totalProfitNpr = $completedOrdersNpr->sum(function ($order) {
            return $order->items->sum(function ($item) {
                return ($item->price - $item->purchase_price) * $item->quantity;
            });
        });

        $stats = [
            'total_sales_npr' => $completedOrdersNpr->sum('total_amount'),
            'total_profit_npr' => $totalProfitNpr,
            'total_orders' => Order::count(),
            'todays_orders' => Order::whereDate('created_at', today())->count(),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'total_users' => User::count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'recentOrders' => $recentOrders,
            'stats' => $stats,
        ]);
    }
}
