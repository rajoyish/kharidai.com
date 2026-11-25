<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FlashesToasts;
use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\WalletTopUp;
use App\Services\Procurement\WalletLedger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class WalletTopUpController extends Controller
{
    use FlashesToasts;

    /**
     * Credit amounts carry up to eight decimal places.
     */
    public const CREDITS_RULE = 'regex:/^\d{1,10}(\.\d{1,8})?$/';

    public function __construct(private readonly WalletLedger $ledger) {}

    public function store(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->ledger->recordTopUp($supplier, $this->validatedTopUp($request));

        $this->toast('success', 'Top-up added.');

        return redirect()->back();
    }

    public function update(Request $request, Supplier $supplier, WalletTopUp $topUp): RedirectResponse
    {
        $data = $topUp->isUntouched()
            ? $this->validatedTopUp($request)
            : $request->validate([
                'reference' => 'nullable|string|max:255',
                'topped_up_at' => 'required|date',
                'notes' => 'nullable|string|max:5000',
            ]);

        $this->ledger->updateTopUp($topUp, $data);

        $this->toast('success', $topUp->isUntouched()
            ? 'Top-up updated.'
            : 'Top-up saved. Amounts can\'t change because some credits are used.');

        return redirect()->back();
    }

    public function destroy(Supplier $supplier, WalletTopUp $topUp): RedirectResponse
    {
        $this->ledger->deleteTopUp($topUp);

        $this->toast('success', 'Top-up removed.');

        return redirect()->back();
    }

    /**
     * @return array{reference: string|null, face_value: string, amount_paid: string, paid_currency: string, fx_rate: string, credits_received: string, topped_up_at: string, notes: string|null}
     */
    private function validatedTopUp(Request $request): array
    {
        $isPaidInNpr = strtoupper((string) $request->input('paid_currency')) === 'NPR';

        return $request->validate([
            'reference' => 'nullable|string|max:255',
            'face_value' => 'required|numeric|gt:0|max:9999999999',
            'amount_paid' => 'required|numeric|gt:0|max:9999999999',
            'paid_currency' => 'required|string|size:3|alpha',
            'fx_rate' => [$isPaidInNpr ? 'nullable' : 'required', 'numeric', 'gt:0', 'max:99999999'],
            'credits_received' => ['required', self::CREDITS_RULE, 'not_regex:/^0+(\.0+)?$/'],
            'topped_up_at' => 'required|date',
            'notes' => 'nullable|string|max:5000',
        ], [
            'credits_received.regex' => 'Enter a number like 8.09676294 (max 8 decimals).',
            'credits_received.not_regex' => 'Must be more than 0.',
        ]);
    }
}
