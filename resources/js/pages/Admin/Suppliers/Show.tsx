import { router } from '@inertiajs/react';
import { useState } from 'react';
import { index as suppliersIndex } from '@/actions/App/Http/Controllers/Admin/SupplierController';
import { destroy as destroyPurchase } from '@/actions/App/Http/Controllers/Admin/WalletPurchaseController';
import { destroy as destroyTopUp } from '@/actions/App/Http/Controllers/Admin/WalletTopUpController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { PersonalPurchaseDialog } from '@/components/procurement/personal-purchase-dialog';
import { PurchasesTable } from '@/components/procurement/purchases-table';
import type { Purchase } from '@/components/procurement/purchases-table';
import { ShopLink } from '@/components/procurement/shop-link';
import { Stat } from '@/components/procurement/stat';
import { SupplierFormDialog } from '@/components/procurement/supplier-form-dialog';
import type {
    PlatformOption,
    SupplierSummary,
} from '@/components/procurement/supplier-form-dialog';
import { TopUpDialog } from '@/components/procurement/top-up-dialog';
import type { TopUp } from '@/components/procurement/top-up-dialog';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatNpr } from '@/lib/currency';
import {
    formatCredits,
    formatPercent,
    formatRate,
    formatSignedPercent,
} from '@/lib/wallet-credits';

export default function SupplierShow({
    supplier,
    topUps,
    purchases,
    platforms,
}: {
    supplier: SupplierSummary;
    topUps: TopUp[];
    purchases: Purchase[];
    platforms: PlatformOption[];
}) {
    const [editingSupplier, setEditingSupplier] = useState(false);
    const [topUpDialog, setTopUpDialog] = useState<TopUp | null | undefined>(
        undefined,
    );
    const [topUpToDelete, setTopUpToDelete] = useState<TopUp | null>(null);
    const [purchaseToReverse, setPurchaseToReverse] = useState<Purchase | null>(
        null,
    );
    const [addingPersonalPurchase, setAddingPersonalPurchase] = useState(false);

    const rateGap =
        supplier.average_npr_per_credit && supplier.latest_npr_per_credit
            ? (supplier.latest_npr_per_credit /
                  supplier.average_npr_per_credit -
                  1) *
              100
            : null;

    return (
        <>
            <SeoHead title={`Supplier - ${supplier.name}`} />

            <PagePanel
                eyebrow="Supplier"
                title={
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {supplier.name}
                        </h1>
                        {supplier.platform_label && (
                            <Badge variant="neutral">
                                {supplier.platform_label}
                            </Badge>
                        )}
                        {supplier.contact && (
                            <span className="text-sm text-muted-foreground">
                                {supplier.contact}
                            </span>
                        )}
                        <ShopLink href={supplier.shop_url} />
                    </div>
                }
                description={supplier.notes ?? undefined}
                variant="transparent"
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setEditingSupplier(true)}
                        >
                            Edit
                        </Button>
                        <Button onClick={() => setTopUpDialog(null)}>
                            Add Top-up
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat
                            label="Balance"
                            value={`${formatCredits(supplier.balance_credits)} credits`}
                        />
                        <Stat
                            label="Worth"
                            value={formatNpr(supplier.cost_remaining_npr)}
                            hint="What you paid for the credits left."
                        />
                        <Stat
                            label="Avg. credit price"
                            value={formatRate(supplier.average_npr_per_credit)}
                        />
                        <Stat
                            label="Latest credit price"
                            value={formatRate(supplier.latest_npr_per_credit)}
                            hint={
                                rateGap === null
                                    ? 'From your last top-up.'
                                    : `${formatSignedPercent(rateGap)} vs average.`
                            }
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top-ups</CardTitle>
                            <CardDescription>
                                Oldest credits are used first.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">
                                            Voucher
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Paid
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Total (Rs.)
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Credits got
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Left
                                        </TableHead>
                                        <TableHead className="text-right">
                                            1 credit
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topUps.map((topUp) => (
                                        <TableRow key={topUp.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {topUp.topped_up_at}
                                                {topUp.reference && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {topUp.reference}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {Number(
                                                    topUp.face_value,
                                                ).toFixed(2)}{' '}
                                                {supplier.voucher_currency}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {Number(
                                                    topUp.amount_paid,
                                                ).toFixed(2)}{' '}
                                                {topUp.paid_currency}
                                                <div className="text-xs text-muted-foreground">
                                                    {topUp.voucher_markup_percent !==
                                                        null &&
                                                        `${formatSignedPercent(topUp.voucher_markup_percent)} over value · `}
                                                    {topUp.paid_currency !==
                                                        'NPR' &&
                                                        `@ ${Number(topUp.fx_rate)}`}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatNpr(topUp.cost_npr)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCredits(
                                                    topUp.credits_received,
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    {formatPercent(
                                                        topUp.credit_yield_percent,
                                                    )}{' '}
                                                    of value
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {Number(
                                                    topUp.credits_remaining,
                                                ) === 0 ? (
                                                    <Badge variant="neutral">
                                                        Used up
                                                    </Badge>
                                                ) : (
                                                    formatCredits(
                                                        topUp.credits_remaining,
                                                    )
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatRate(
                                                    topUp.npr_per_credit,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setTopUpDialog(
                                                                topUp,
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </Button>
                                                    {topUp.is_untouched && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() =>
                                                                setTopUpToDelete(
                                                                    topUp,
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {topUps.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="h-20 text-center text-muted-foreground"
                                            >
                                                No top-ups yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
                            <div className="grid gap-1.5">
                                <CardTitle>Purchases</CardTitle>
                                <CardDescription>
                                    Buy for the store from a product&rsquo;s
                                    Pricing page. Buying for yourself? Add a
                                    personal purchase: it spends credits but
                                    counts no profit or tithe.
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAddingPersonalPurchase(true)}
                            >
                                Personal purchase
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <PurchasesTable
                                purchases={purchases}
                                onReverse={setPurchaseToReverse}
                            />
                        </CardContent>
                    </Card>
                </div>
            </PagePanel>

            {editingSupplier && (
                <SupplierFormDialog
                    supplier={supplier}
                    platforms={platforms}
                    onClose={() => setEditingSupplier(false)}
                />
            )}

            {topUpDialog !== undefined && (
                <TopUpDialog
                    supplierId={supplier.id}
                    voucherCurrency={supplier.voucher_currency}
                    topUp={topUpDialog}
                    onClose={() => setTopUpDialog(undefined)}
                />
            )}

            {topUpToDelete && (
                <ConfirmDialog
                    title="Delete this top-up?"
                    description="None of these credits are used yet."
                    onConfirm={() =>
                        router.delete(
                            destroyTopUp.url({
                                supplier: supplier.id,
                                topUp: topUpToDelete.id,
                            }),
                            {
                                preserveScroll: true,
                                onFinish: () => setTopUpToDelete(null),
                            },
                        )
                    }
                    onOpenChange={(open) => !open && setTopUpToDelete(null)}
                />
            )}

            {addingPersonalPurchase && (
                <PersonalPurchaseDialog
                    supplierId={supplier.id}
                    supplierName={supplier.name}
                    balanceCredits={supplier.balance_credits}
                    onClose={() => setAddingPersonalPurchase(false)}
                />
            )}

            {purchaseToReverse && (
                <ConfirmDialog
                    title="Undo this purchase?"
                    description={`${formatCredits(purchaseToReverse.credits_spent)} credits (${formatNpr(purchaseToReverse.cost_npr)}) go back to ${supplier.name}.`}
                    confirmLabel="Undo"
                    onConfirm={() =>
                        router.delete(
                            destroyPurchase.url({
                                supplier: supplier.id,
                                purchase: purchaseToReverse.id,
                            }),
                            {
                                preserveScroll: true,
                                onFinish: () => setPurchaseToReverse(null),
                            },
                        )
                    }
                    onOpenChange={(open) => !open && setPurchaseToReverse(null)}
                />
            )}
        </>
    );
}

SupplierShow.layout = {
    breadcrumbs: [
        { title: 'Suppliers', href: suppliersIndex().url },
        { title: 'Supplier', href: '#' },
    ],
};
