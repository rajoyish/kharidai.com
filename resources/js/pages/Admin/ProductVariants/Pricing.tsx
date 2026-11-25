import { Link, router, useForm } from '@inertiajs/react';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { index as productsIndex } from '@/actions/App/Http/Controllers/Admin/ProductController';
import { edit as editVariant } from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
import { show as showSupplier } from '@/actions/App/Http/Controllers/Admin/SupplierController';
import {
    apply as applyPrice,
    assignSupplier,
    quote as quotePrice,
} from '@/actions/App/Http/Controllers/Admin/VariantPricingController';
import {
    destroy as destroyPurchase,
    store as storePurchase,
} from '@/actions/App/Http/Controllers/Admin/WalletPurchaseController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import {
    asInput,
    CalculatorFields,
    QuoteBreakdown,
    SupplierFields,
    trimCredits,
    usePriceCalculator,
} from '@/components/procurement/price-calculator';
import type {
    CalculatorDefaults,
    Option,
} from '@/components/procurement/price-calculator';
import { PriceHistoryChart } from '@/components/procurement/price-history-chart';
import { PurchasesTable } from '@/components/procurement/purchases-table';
import type { Purchase } from '@/components/procurement/purchases-table';
import { ShopLink } from '@/components/procurement/shop-link';
import { SupplierFormDialog } from '@/components/procurement/supplier-form-dialog';
import type {
    PlatformOption,
    SupplierSummary,
} from '@/components/procurement/supplier-form-dialog';
import { SeoHead } from '@/components/seo-head';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatNpr } from '@/lib/currency';
import {
    formatCredits,
    formatRate,
    formatSignedPercent,
} from '@/lib/wallet-credits';

type Snapshot = {
    id: number;
    source: 'calculator' | 'manual';
    source_label: string;
    selling_price_npr: number;
    purchase_price_npr: number | null;
    landed_cost_npr: number | null;
    extra_cost_npr: number | null;
    cost_npr: number | null;
    supplier_cost_credits: string | null;
    npr_per_credit: string | null;
    cost_basis_label: string | null;
    target_profit_npr: number | null;
    target_margin_percent: string | null;
    supplier_name: string | null;
    user_name: string | null;
    notes: string | null;
    recorded_at: string;
};

type Props = {
    product: { id: number; title: string; slug: string; type: string | null };
    variant: {
        id: number;
        name: string;
        price_npr: number;
        purchase_price_npr: number | null;
        supplier_id: number | null;
        supplier_cost_credits: string | null;
    };
    suppliers: SupplierSummary[];
    platforms: PlatformOption[];
    defaults: CalculatorDefaults & { supplier_cost_credits: string };
    costDrift: {
        current_cost_npr: number;
        recorded_cost_npr: number | null;
    } | null;
    snapshots: Snapshot[];
    purchases: Purchase[];
    costBases: Option[];
    roundings: Option[];
};

const today = () => new Date().toISOString().slice(0, 10);

const recordedAt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string | null;
}) {
    return (
        <Card className="gap-1 py-4">
            <CardContent className="px-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-xl font-semibold tabular-nums">
                    {value}
                </div>
                {hint && (
                    <div className="text-xs text-muted-foreground">{hint}</div>
                )}
            </CardContent>
        </Card>
    );
}

export default function VariantPricing({
    product,
    variant,
    suppliers,
    platforms,
    defaults,
    costDrift,
    snapshots,
    purchases,
    costBases,
    roundings,
}: Props) {
    const [addingSupplier, setAddingSupplier] = useState(false);
    const [purchaseToReverse, setPurchaseToReverse] = useState<Purchase | null>(
        null,
    );

    const { calculator, quote, isManual, supplier, isReady, requote } =
        usePriceCalculator({
            quoteUrl: quotePrice.url({
                product: product.slug,
                variant: variant.id,
            }),
            defaults,
            suppliers,
        });

    const applyForm = useForm({ update_purchase_price: true, notes: '' });
    const assignForm = useForm({});
    const buyForm = useForm({ quantity: '1', is_personal: false });

    const { data, setData } = calculator;

    // A supplier added from this page arrives with the reloaded props; pick
    // it as soon as it appears.
    const knownSupplierIds = useRef(suppliers.map((option) => option.id));
    useEffect(() => {
        const added = suppliers.find(
            (option) => !knownSupplierIds.current.includes(option.id),
        );
        knownSupplierIds.current = suppliers.map((option) => option.id);

        if (added) {
            setData((current) => ({
                ...current,
                supplier_id: String(added.id),
                cost_basis:
                    current.cost_basis === 'manual'
                        ? 'fifo'
                        : current.cost_basis,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suppliers]);

    const isSupplierChanged =
        data.supplier_id !== asInput(variant.supplier_id) ||
        data.supplier_cost_credits !==
            trimCredits(variant.supplier_cost_credits);

    const saveSupplier = () => {
        assignForm.transform(() => ({
            supplier_id: data.supplier_id,
            supplier_cost_credits: data.supplier_cost_credits,
        }));
        assignForm.patch(
            assignSupplier.url({ product: product.slug, variant: variant.id }),
            { preserveScroll: true },
        );
    };

    const buyQuantity = Math.max(0, Math.floor(Number(buyForm.data.quantity)));
    const creditsForBuy = Number(data.supplier_cost_credits) * buyQuantity;
    const balanceAfterBuy = supplier
        ? Number(supplier.balance_credits) - creditsForBuy
        : null;
    const canBuy =
        supplier !== undefined &&
        creditsForBuy > 0 &&
        balanceAfterBuy !== null &&
        balanceAfterBuy >= 0;

    /**
     * Buys from the chosen supplier: the credits come out of that supplier's
     * wallet, oldest top-up first, and the page reloads with the new balance.
     */
    const buy = () => {
        if (!supplier) {
            return;
        }

        buyForm.transform((buyData) => ({
            product_variant_id: variant.id,
            unit_cost_credits: data.supplier_cost_credits,
            quantity: buyData.quantity,
            is_personal: buyData.is_personal,
            purchased_at: today(),
        }));
        buyForm.post(storePurchase.url(supplier.id), {
            preserveScroll: true,
            onSuccess: () => {
                buyForm.reset();
                requote();
            },
        });
    };

    const apply = () => {
        applyForm.transform((applyData) => ({ ...data, ...applyData }));
        applyForm.post(
            applyPrice.url({ product: product.slug, variant: variant.id }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    applyForm.reset('notes');
                    setData('final_price_npr', '');
                },
            },
        );
    };

    const chartPrices = useMemo(
        () =>
            snapshots.map((snapshot) => ({
                at: snapshot.recorded_at,
                price: snapshot.selling_price_npr,
                cost: snapshot.cost_npr,
            })),
        [snapshots],
    );
    // A personal purchase is not stock for a sale, so it is no cost signal.
    const chartPurchases = useMemo(
        () =>
            purchases
                .filter((purchase) => !purchase.is_personal)
                .map((purchase) => ({
                    at: purchase.purchased_at,
                    unitCost: purchase.unit_cost_npr,
                    quantity: purchase.quantity,
                })),
        [purchases],
    );

    const drift =
        costDrift && costDrift.recorded_cost_npr
            ? (costDrift.current_cost_npr / costDrift.recorded_cost_npr - 1) *
              100
            : null;
    const currentProfit = variant.price_npr - (variant.purchase_price_npr ?? 0);
    const priceChange =
        quote?.selling_price_npr != null
            ? quote.selling_price_npr - variant.price_npr
            : null;
    const errors = {
        ...calculator.errors,
        ...assignForm.errors,
        ...buyForm.errors,
        ...applyForm.errors,
    } as Record<string, string | undefined>;

    return (
        <>
            <SeoHead title={`Pricing - ${variant.name}`} />

            <PagePanel
                eyebrow={`Pricing · ${product.title}`}
                title={variant.name}
                variant="transparent"
                actions={
                    <Button variant="outline" asChild>
                        <Link
                            href={editVariant.url({
                                product: product.slug,
                                variant: variant.id,
                            })}
                        >
                            Edit Variant
                        </Link>
                    </Button>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Stat
                            label="Selling price"
                            value={formatNpr(variant.price_npr)}
                        />
                        <Stat
                            label="Purchase price"
                            value={
                                variant.purchase_price_npr
                                    ? formatNpr(variant.purchase_price_npr)
                                    : '—'
                            }
                        />
                        <Stat
                            label="Profit"
                            value={
                                variant.purchase_price_npr
                                    ? formatNpr(currentProfit)
                                    : '—'
                            }
                            hint={
                                variant.purchase_price_npr &&
                                variant.price_npr > 0
                                    ? `${((currentProfit / variant.price_npr) * 100).toFixed(1)}% profit`
                                    : null
                            }
                        />
                    </div>

                    {drift !== null && Math.abs(drift) >= 2 && costDrift && (
                        <Alert variant={drift > 0 ? 'destructive' : 'default'}>
                            {drift > 0 ? (
                                <TrendingUp aria-hidden="true" />
                            ) : (
                                <TrendingDown aria-hidden="true" />
                            )}
                            <AlertTitle>
                                Cost {drift > 0 ? 'went up' : 'went down'}{' '}
                                {formatSignedPercent(drift)}
                            </AlertTitle>
                            <AlertDescription>
                                Now {formatNpr(costDrift.current_cost_npr)}, was{' '}
                                {formatNpr(costDrift.recorded_cost_npr ?? 0)}.
                                {drift > 0
                                    ? ' Update the price to keep your profit.'
                                    : ' You can lower the price.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle>Supplier</CardTitle>
                                    <CardDescription className="mt-1.5">
                                        Who you buy this from.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddingSupplier(true)}
                                >
                                    <Plus aria-hidden="true" />
                                    New supplier
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 lg:grid-cols-2">
                            <div className="grid content-start gap-4 sm:grid-cols-2">
                                <SupplierFields
                                    calculator={calculator}
                                    suppliers={suppliers}
                                    errors={errors}
                                />

                                <div className="flex items-center gap-3 sm:col-span-2">
                                    <Button
                                        type="button"
                                        onClick={saveSupplier}
                                        disabled={
                                            !data.supplier_id ||
                                            !isSupplierChanged ||
                                            assignForm.processing
                                        }
                                    >
                                        Save supplier
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        {isSupplierChanged
                                            ? 'Not saved yet.'
                                            : variant.supplier_id
                                              ? 'Saved for this product.'
                                              : ''}
                                    </span>
                                </div>
                            </div>

                            {supplier ? (
                                <div className="grid content-start gap-3 rounded-md border p-4 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {supplier.platform_label && (
                                            <Badge variant="neutral">
                                                {supplier.platform_label}
                                            </Badge>
                                        )}
                                        {supplier.contact && (
                                            <span className="text-muted-foreground">
                                                {supplier.contact}
                                            </span>
                                        )}
                                        <ShopLink href={supplier.shop_url} />
                                        <Link
                                            className="ml-auto text-xs underline"
                                            href={showSupplier.url(supplier.id)}
                                        >
                                            Top up / history
                                        </Link>
                                    </div>
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="text-muted-foreground">
                                            Available
                                        </span>
                                        <span className="font-medium tabular-nums">
                                            {formatCredits(
                                                supplier.balance_credits,
                                            )}{' '}
                                            credits
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="text-muted-foreground">
                                            Left after buying {buyQuantity}
                                        </span>
                                        <span
                                            className={
                                                balanceAfterBuy !== null &&
                                                balanceAfterBuy < 0
                                                    ? 'font-medium text-destructive tabular-nums'
                                                    : 'font-medium tabular-nums'
                                            }
                                        >
                                            {balanceAfterBuy === null ||
                                            creditsForBuy <= 0
                                                ? '—'
                                                : balanceAfterBuy < 0
                                                  ? 'Not enough credits'
                                                  : `${formatCredits(balanceAfterBuy.toFixed(8))} credits`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            aria-label="Quantity to buy"
                                            type="number"
                                            min="1"
                                            step="1"
                                            className="w-20"
                                            value={buyForm.data.quantity}
                                            onChange={(e) =>
                                                buyForm.setData(
                                                    'quantity',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            className="flex-1"
                                            onClick={buy}
                                            disabled={
                                                !canBuy || buyForm.processing
                                            }
                                        >
                                            Buy
                                            {creditsForBuy > 0 &&
                                                ` · ${formatCredits(creditsForBuy.toFixed(8))} credits`}
                                        </Button>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="buy_is_personal"
                                            checked={buyForm.data.is_personal}
                                            onCheckedChange={(checked) =>
                                                buyForm.setData(
                                                    'is_personal',
                                                    checked === true,
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor="buy_is_personal"
                                            className="grid gap-0.5 font-normal"
                                        >
                                            For my own use
                                            <span className="text-xs text-muted-foreground">
                                                Credits are still spent, but
                                                this product&rsquo;s cost
                                                doesn&rsquo;t change.
                                            </span>
                                        </Label>
                                    </div>
                                    {(errors.unit_cost_credits ||
                                        errors.quantity) && (
                                        <div className="text-sm text-destructive">
                                            {errors.unit_cost_credits ??
                                                errors.quantity}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Buying takes the credits out of{' '}
                                        {supplier.name}. Setting the price does
                                        not.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                                    {suppliers.length === 0
                                        ? 'Add a supplier to buy this product.'
                                        : 'Choose a supplier to see its balance.'}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-5">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Price calculator</CardTitle>
                                <CardDescription>
                                    Credits &rarr; rupees, plus your profit.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-5 sm:grid-cols-2">
                                <CalculatorFields
                                    calculator={calculator}
                                    quote={quote}
                                    supplier={supplier}
                                    suppliers={suppliers}
                                    costBases={costBases}
                                    roundings={roundings}
                                    errors={errors}
                                />
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle>Result</CardTitle>
                                    {calculator.processing && (
                                        <Badge variant="neutral">
                                            Updating…
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>For 1 unit.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {!isReady || !quote ? (
                                    <p className="text-sm text-muted-foreground">
                                        {suppliers.length === 0 && !isManual
                                            ? 'No supplier yet. Add one above, or pick "Type my own" as the credit rate.'
                                            : 'Enter the supplier price in credits.'}
                                    </p>
                                ) : (
                                    <>
                                        <QuoteBreakdown
                                            quote={quote}
                                            costBasis={data.cost_basis}
                                            costBases={costBases}
                                        />

                                        {priceChange !== null &&
                                            priceChange !== 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    {priceChange > 0
                                                        ? 'Up'
                                                        : 'Down'}{' '}
                                                    {formatNpr(
                                                        Math.abs(priceChange),
                                                    )}{' '}
                                                    from{' '}
                                                    {formatNpr(
                                                        variant.price_npr,
                                                    )}
                                                    .
                                                </p>
                                            )}

                                        <div className="grid gap-3 border-t pt-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id="update_purchase_price"
                                                    checked={
                                                        applyForm.data
                                                            .update_purchase_price
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        applyForm.setData(
                                                            'update_purchase_price',
                                                            checked,
                                                        )
                                                    }
                                                />
                                                <Label htmlFor="update_purchase_price">
                                                    Also update purchase price
                                                </Label>
                                            </div>
                                            <Textarea
                                                aria-label="Note"
                                                rows={2}
                                                value={applyForm.data.notes}
                                                onChange={(e) =>
                                                    applyForm.setData(
                                                        'notes',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Note (optional), e.g. Google One Pro new price"
                                            />
                                            <Button
                                                onClick={apply}
                                                disabled={
                                                    applyForm.processing ||
                                                    calculator.processing ||
                                                    quote.selling_price_npr ===
                                                        null
                                                }
                                            >
                                                Apply{' '}
                                                {quote.selling_price_npr !==
                                                    null &&
                                                    formatNpr(
                                                        quote.selling_price_npr,
                                                    )}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Price &amp; cost over time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PriceHistoryChart
                                prices={chartPrices}
                                purchases={chartPurchases}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Price history</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>When</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">
                                            Price
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Cost
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Profit
                                        </TableHead>
                                        <TableHead>Credits</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {snapshots.map((snapshot) => {
                                        const margin =
                                            snapshot.cost_npr !== null
                                                ? snapshot.selling_price_npr -
                                                  snapshot.cost_npr
                                                : null;

                                        return (
                                            <TableRow key={snapshot.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {recordedAt.format(
                                                        Date.parse(
                                                            snapshot.recorded_at,
                                                        ),
                                                    )}
                                                    {snapshot.user_name && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {snapshot.user_name}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            snapshot.source ===
                                                            'calculator'
                                                                ? 'info'
                                                                : 'neutral'
                                                        }
                                                    >
                                                        {snapshot.source_label}
                                                    </Badge>
                                                    {snapshot.notes && (
                                                        <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                                                            {snapshot.notes}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatNpr(
                                                        snapshot.selling_price_npr,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {snapshot.cost_npr === null
                                                        ? '—'
                                                        : formatNpr(
                                                              snapshot.cost_npr,
                                                          )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {margin === null
                                                        ? '—'
                                                        : `${formatNpr(margin)}${snapshot.selling_price_npr > 0 ? ` · ${((margin / snapshot.selling_price_npr) * 100).toFixed(1)}%` : ''}`}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {snapshot.supplier_cost_credits ? (
                                                        <>
                                                            {formatCredits(
                                                                snapshot.supplier_cost_credits,
                                                            )}{' '}
                                                            credits ×{' '}
                                                            {formatRate(
                                                                snapshot.npr_per_credit,
                                                            )}
                                                            <div>
                                                                {
                                                                    snapshot.cost_basis_label
                                                                }
                                                                {snapshot.supplier_name &&
                                                                    ` · ${snapshot.supplier_name}`}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {snapshots.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="h-20 text-center text-muted-foreground"
                                            >
                                                No price changes yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Purchases</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PurchasesTable
                                purchases={purchases}
                                showVariant={false}
                                onReverse={setPurchaseToReverse}
                            />
                        </CardContent>
                    </Card>
                </div>
            </PagePanel>

            {addingSupplier && (
                <SupplierFormDialog
                    supplier={null}
                    platforms={platforms}
                    stayOnPage
                    onClose={() => setAddingSupplier(false)}
                />
            )}

            {purchaseToReverse && (
                <ConfirmDialog
                    title="Undo this purchase?"
                    description={`${formatCredits(purchaseToReverse.credits_spent)} credits (${formatNpr(purchaseToReverse.cost_npr)}) go back to ${purchaseToReverse.supplier_name ?? 'the supplier'}.`}
                    confirmLabel="Undo"
                    onConfirm={() =>
                        router.delete(
                            destroyPurchase.url({
                                supplier: purchaseToReverse.supplier_id,
                                purchase: purchaseToReverse.id,
                            }),
                            {
                                preserveScroll: true,
                                onFinish: () => {
                                    setPurchaseToReverse(null);
                                    requote();
                                },
                            },
                        )
                    }
                    onOpenChange={(open) => !open && setPurchaseToReverse(null)}
                />
            )}
        </>
    );
}

VariantPricing.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Variants', href: '#' },
        { title: 'Pricing', href: '#' },
    ],
};
