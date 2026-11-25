<?php

namespace App\Http\Controllers\Admin;

use App\Casts\WalletCredits;
use App\Enums\PurchasePlatform;
use App\Http\Controllers\Concerns\FlashesToasts;
use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\WalletPurchase;
use App\Models\WalletTopUp;
use App\Services\Procurement\ShopLink;
use App\Services\Procurement\WalletLedger;
use App\Services\Procurement\WalletSpendReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Suppliers and the prepaid wallet each one holds. Purchases are made from a
 * variant's pricing page; this screen funds the wallet and shows its history.
 */
class SupplierController extends Controller
{
    use FlashesToasts;

    public function __construct(private readonly WalletLedger $ledger) {}

    public function index(WalletSpendReport $spendReport): Response
    {
        $suppliers = Supplier::query()
            ->with('latestTopUp')
            ->withCount(['variants', 'purchases'])
            ->orderBy('name')
            ->get()
            ->map(fn (Supplier $supplier): array => [
                ...$this->supplierSummary($supplier),
                'variants_count' => $supplier->variants_count,
                'purchases_count' => $supplier->purchases_count,
            ]);

        return Inertia::render('Admin/Suppliers/Index', [
            'suppliers' => $suppliers,
            'platforms' => PurchasePlatform::options(),
            'spend' => $spendReport->build(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $supplier = Supplier::create($this->validatedSupplier($request));

        $this->toast('success', 'Supplier added.');

        // The pricing page adds suppliers inline and stays where it is.
        return $request->boolean('stay')
            ? redirect()->back()
            : redirect()->route('admin.suppliers.show', $supplier);
    }

    public function show(Supplier $supplier): Response
    {
        $supplier->load('latestTopUp');

        $topUps = $supplier->topUps()
            ->latest('topped_up_at')
            ->latest('id')
            ->get()
            ->map(fn (WalletTopUp $topUp): array => [
                'id' => $topUp->id,
                'reference' => $topUp->reference,
                'face_value' => $topUp->face_value,
                'amount_paid' => $topUp->amount_paid,
                'paid_currency' => $topUp->paid_currency,
                'fx_rate' => $topUp->fx_rate,
                'cost_npr' => $topUp->cost_npr,
                'credits_received' => $topUp->credits_received,
                'credits_remaining' => $topUp->credits_remaining,
                'npr_per_credit' => round($topUp->nprPerCredit(), 6),
                'voucher_markup_percent' => $this->roundOrNull($topUp->voucherMarkupPercent($supplier->voucher_currency)),
                'credit_yield_percent' => $this->roundOrNull($topUp->creditYieldPercent()),
                'topped_up_at' => $topUp->topped_up_at->toDateString(),
                'notes' => $topUp->notes,
                'is_untouched' => $topUp->isUntouched(),
            ]);

        $purchases = $supplier->purchases()
            ->with(['variant.product:id,title,slug', 'supplier:id,name'])
            ->latest('purchased_at')
            ->latest('id')
            ->limit(200)
            ->get()
            ->map(fn (WalletPurchase $purchase): array => self::purchaseRow($purchase));

        return Inertia::render('Admin/Suppliers/Show', [
            'supplier' => $this->supplierSummary($supplier),
            'topUps' => $topUps,
            'purchases' => $purchases,
            'platforms' => PurchasePlatform::options(),
        ]);
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($this->validatedSupplier($request));

        $this->toast('success', 'Supplier saved.');

        return redirect()->back();
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        if (! $supplier->isUnused()) {
            $this->toast('error', 'This supplier has top-ups or purchases, so it can\'t be deleted.');

            return redirect()->back();
        }

        $supplier->delete();

        $this->toast('success', 'Supplier deleted.');

        return redirect()->route('admin.suppliers.index');
    }

    /**
     * A supplier with its wallet's live balance and credit prices.
     *
     * @return array<string, mixed>
     */
    public static function summary(Supplier $supplier, WalletLedger $ledger): array
    {
        $wallet = $ledger->summary($supplier);

        return [
            'id' => $supplier->id,
            'name' => $supplier->name,
            'platform' => $supplier->platform->value,
            // "Other" says nothing about the supplier, so it is not shown.
            'platform_label' => $supplier->platform === PurchasePlatform::Other ? null : $supplier->platform->label(),
            'contact' => $supplier->contact,
            'shop_url' => $supplier->shop_url,
            'voucher_currency' => $supplier->voucher_currency,
            'notes' => $supplier->notes,
            'balance_credits' => WalletCredits::toDecimal($wallet['balance_units']),
            'cost_remaining_npr' => $wallet['cost_remaining_paisa'] / 100,
            'average_npr_per_credit' => $wallet['average_npr_per_credit'] === null ? null : round($wallet['average_npr_per_credit'], 6),
            'latest_npr_per_credit' => $wallet['latest_npr_per_credit'] === null ? null : round($wallet['latest_npr_per_credit'], 6),
            'latest_top_up_at' => $supplier->latestTopUp?->topped_up_at->toDateString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function purchaseRow(WalletPurchase $purchase): array
    {
        return [
            'id' => $purchase->id,
            'supplier_id' => $purchase->supplier_id,
            'supplier_name' => $purchase->supplier?->name,
            'is_personal' => $purchase->is_personal,
            'description' => $purchase->description,
            'reference' => $purchase->reference,
            'variant' => $purchase->variant ? [
                'id' => $purchase->variant->id,
                'name' => $purchase->variant->name,
                'product_title' => $purchase->variant->product?->title,
                'product_slug' => $purchase->variant->product?->slug,
            ] : null,
            'quantity' => $purchase->quantity,
            'unit_cost_credits' => $purchase->unit_cost_credits,
            'credits_spent' => $purchase->credits_spent,
            'cost_npr' => $purchase->cost_npr,
            'unit_cost_npr' => $purchase->unitCostNpr(),
            'purchased_at' => $purchase->purchased_at->toDateString(),
            'notes' => $purchase->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function supplierSummary(Supplier $supplier): array
    {
        return self::summary($supplier, $this->ledger);
    }

    /**
     * @return array{name: string, platform: string, contact: string|null, shop_url: string|null, voucher_currency: string, notes: string|null}
     */
    private function validatedSupplier(Request $request): array
    {
        // "@DanteHubBot" and "dantehub.com" are saved as full links, and the
        // platform falls back to whatever the link points at.
        $shopUrl = ShopLink::normalize($request->input('shop_url'));
        $request->merge([
            'shop_url' => $shopUrl,
            'platform' => $request->filled('platform') ? $request->input('platform') : ShopLink::platformFor($shopUrl)?->value,
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'platform' => ['required', Rule::enum(PurchasePlatform::class)],
            'contact' => 'nullable|string|max:255',
            'shop_url' => 'nullable|url:http,https|max:2048',
            'voucher_currency' => 'required|string|size:3|alpha',
            'notes' => 'nullable|string|max:5000',
        ], [
            'shop_url.url' => 'Enter a link like https://t.me/googleone_shop_bot, @googleone_shop_bot or a website.',
        ]);

        $validated['voucher_currency'] = strtoupper($validated['voucher_currency']);

        return $validated;
    }

    private function roundOrNull(?float $value, int $precision = 2): ?float
    {
        return $value === null ? null : round($value, $precision);
    }
}
