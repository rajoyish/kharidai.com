<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $recentOrders = \App\Models\Order::with(['user', 'paymentReceipt'])
            ->latest()
            ->take(5)
            ->get();

        $stats = [
            'total_sales_npr' => \App\Models\Order::where('status', 'completed')->where('currency', 'npr')->sum('total_amount'),
            'total_sales_usd' => \App\Models\Order::where('status', 'completed')->where('currency', 'usd')->sum('total_amount'),
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
