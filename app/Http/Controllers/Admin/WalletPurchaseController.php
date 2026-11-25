<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FlashesToasts;
use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\WalletPurchase;
use App\Services\Procurement\WalletLedger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class WalletPurchaseController extends Controller
{
    use FlashesToasts;

    public function __construct(private readonly WalletLedger $ledger) {}

    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'reference' => 'nullable|string|max:255',
            'quantity' => 'required|integer|min:1|max:10000',
            'unit_cost_credits' => ['required', WalletTopUpController::CREDITS_RULE, 'not_regex:/^0+(\.0+)?$/'],
            'purchased_at' => 'required|date',
            'notes' => 'nullable|string|max:5000',
        ], [
            'unit_cost_credits.regex' => 'Enter a number like 2.04 (max 8 decimals).',
            'unit_cost_credits.not_regex' => 'Must be more than 0.',
        ]);

        $purchase = $this->ledger->recordPurchase($supplier, $validated, $request->user());

        $this->toast('success', sprintf(
            'Purchase added. Cost: Rs. %s.',
            number_format($purchase->cost_npr, 2),
        ));

        return redirect()->back();
    }

    public function destroy(Supplier $supplier, WalletPurchase $purchase): RedirectResponse
    {
        $this->ledger->reversePurchase($purchase);

        $this->toast('success', 'Purchase undone. Credits are back in the wallet.');

        return redirect()->back();
    }
}
