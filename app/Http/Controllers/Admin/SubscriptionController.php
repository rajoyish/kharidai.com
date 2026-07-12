<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        $subscriptions = Subscription::with([
            'user:id,name,email,mobile_number',
            'orderItem.productVariant.product',
            'order.items.serviceEngagements',
        ])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('order', fn ($order) => $order->where('order_number', 'like', "%{$search}%"))
                        ->orWhereHas('user', function ($user) use ($search) {
                            $user->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('orderItem.productVariant.product', fn ($product) => $product->where('title', 'like', "%{$search}%"));
                });
            })
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Subscriptions/Index', [
            'subscriptions' => $subscriptions,
            'filters' => ['search' => $search],
        ]);
    }
}
