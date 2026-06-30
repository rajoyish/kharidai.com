<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\RedirectResponse;
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
        $subscriptions = $request->user()
            ->subscriptions()
            ->with([
                'orderItem.productVariant.product',
                'order',
            ])
            ->latest('id')
            ->get();

        return Inertia::render('User/Subscriptions/Index', [
            'subscriptions' => $subscriptions,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Subscription $subscription): RedirectResponse
    {
        // Simple authorization: ensure the subscription belongs to the user
        abort_unless($subscription->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'user_label' => ['nullable', 'string', 'max:255'],
        ]);

        $subscription->update($validated);

        return back();
    }
}
