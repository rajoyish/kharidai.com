<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentMethodController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/PaymentMethods/Index', [
            'paymentMethods' => PaymentMethod::query()
                ->ordered()
                ->get(['id', 'key', 'label', 'is_enabled']),
        ]);
    }

    /**
     * Take a provider in or out of service. Disabling one greys out its button
     * on every customer-facing QR panel; the rows themselves are fixed, so this
     * is the only field an admin can write.
     */
    public function update(Request $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $validated = $request->validate([
            'is_enabled' => 'required|boolean',
        ]);

        $paymentMethod->update(['is_enabled' => $validated['is_enabled']]);

        $status = $paymentMethod->is_enabled ? 'enabled' : 'disabled';

        return redirect()->back()->with('success', "{$paymentMethod->label} is now {$status}.");
    }
}
