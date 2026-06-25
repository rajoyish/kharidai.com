<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $recentOrders = \App\Models\Order::with(['user', 'paymentReceipt', 'items'])
            ->latest()
            ->take(5)
            ->get();

        $completedOrdersNpr = \App\Models\Order::where('status', 'completed')->where('currency', 'npr')->with('items')->get();
        $completedOrdersUsd = \App\Models\Order::where('status', 'completed')->where('currency', 'usd')->with('items')->get();

        $totalProfitNpr = $completedOrdersNpr->sum(function ($order) {
            return $order->items->sum(function ($item) {
                return ($item->price - $item->purchase_price) * $item->quantity;
            });
        });

        $totalProfitUsd = $completedOrdersUsd->sum(function ($order) {
            return $order->items->sum(function ($item) {
                return ($item->price - $item->purchase_price) * $item->quantity;
            });
        });

        $stats = [
            'total_sales_npr' => $completedOrdersNpr->sum('total_amount'),
            'total_sales_usd' => $completedOrdersUsd->sum('total_amount'),
            'total_profit_npr' => $totalProfitNpr,
            'total_profit_usd' => $totalProfitUsd,
            'total_orders' => \App\Models\Order::count(),
            'todays_orders' => \App\Models\Order::whereDate('created_at', today())->count(),
            'pending_orders' => \App\Models\Order::where('status', 'pending')->count(),
            'total_users' => \App\Models\User::count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'recentOrders' => $recentOrders,
            'stats' => $stats,
        ]);
    }
}
