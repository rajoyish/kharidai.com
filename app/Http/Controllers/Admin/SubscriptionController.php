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
        $subscriptions = Subscription::with([
            'user:id,name,email,mobile_number',
            'orderItem.productVariant.product',
            'order.items.serviceEngagements',
        ])->latest('id')->paginate(10);

        return Inertia::render('Admin/Subscriptions/Index', [
            'subscriptions' => $subscriptions,
        ]);
    }
}
