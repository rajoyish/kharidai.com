import { Link, router } from '@inertiajs/react';
import { Store } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroySupplier,
    index as suppliersIndex,
    show as showSupplier,
} from '@/actions/App/Http/Controllers/Admin/SupplierController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { ShopLink } from '@/components/procurement/shop-link';
import { SupplierFormDialog } from '@/components/procurement/supplier-form-dialog';
import type {
    PlatformOption,
    SupplierSummary,
} from '@/components/procurement/supplier-form-dialog';
import { WalletSpendOverview } from '@/components/procurement/wallet-spend-overview';
import type { WalletSpend } from '@/components/procurement/wallet-spend-overview';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatNpr } from '@/lib/currency';
import { formatCredits, formatRate } from '@/lib/wallet-credits';

type SupplierRow = SupplierSummary & {
    variants_count: number;
    purchases_count: number;
};

export default function SuppliersIndex({
    suppliers,
    platforms,
    spend,
}: {
    suppliers: SupplierRow[];
    platforms: PlatformOption[];
    spend: WalletSpend;
}) {
    const [editing, setEditing] = useState<SupplierRow | null | undefined>(
        undefined,
    );
    const [supplierToDelete, setSupplierToDelete] =
        useState<SupplierRow | null>(null);

    return (
        <>
            <SeoHead title="Suppliers" />

            <PagePanel
                eyebrow="Catalog"
                title="Suppliers"
                description="Who you buy from, and the credits you have with each."
                variant="transparent"
                actions={
                    <Button onClick={() => setEditing(null)}>
                        New Supplier
                    </Button>
                }
            >
                <div className="flex flex-col gap-6">
                    {suppliers.length > 0 && (
                        <WalletSpendOverview spend={spend} />
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Buy on</TableHead>
                                <TableHead className="text-right">
                                    Balance
                                </TableHead>
                                <TableHead className="text-right">
                                    Worth (Rs.)
                                </TableHead>
                                <TableHead className="text-right">
                                    Latest credit price
                                </TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell>
                                        <Link
                                            href={showSupplier.url(supplier.id)}
                                            className="font-medium hover:underline"
                                        >
                                            {supplier.name}
                                        </Link>
                                        <div className="text-xs text-muted-foreground">
                                            {supplier.variants_count} products ·{' '}
                                            {supplier.purchases_count} purchases
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {supplier.platform_label && (
                                            <Badge variant="neutral">
                                                {supplier.platform_label}
                                            </Badge>
                                        )}
                                        {supplier.contact && (
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {supplier.contact}
                                            </div>
                                        )}
                                        <ShopLink
                                            href={supplier.shop_url}
                                            className="mt-1"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatCredits(
                                            supplier.balance_credits,
                                        )}{' '}
                                        credits
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatNpr(supplier.cost_remaining_npr)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatRate(
                                            supplier.latest_npr_per_credit,
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={showSupplier.url(
                                                        supplier.id,
                                                    )}
                                                >
                                                    Open
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setEditing(supplier)
                                                }
                                            >
                                                Edit
                                            </Button>
                                            {supplier.purchases_count === 0 &&
                                                supplier.latest_top_up_at ===
                                                    null && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() =>
                                                            setSupplierToDelete(
                                                                supplier,
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
                            {suppliers.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        <Store
                                            className="mx-auto mb-2 size-6"
                                            aria-hidden="true"
                                        />
                                        No suppliers yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </PagePanel>

            {editing !== undefined && (
                <SupplierFormDialog
                    supplier={editing}
                    platforms={platforms}
                    onClose={() => setEditing(undefined)}
                />
            )}

            {supplierToDelete && (
                <ConfirmDialog
                    title="Delete this supplier?"
                    description={`“${supplierToDelete.name}” has no top-ups or purchases, so nothing is lost.`}
                    onConfirm={() =>
                        router.delete(
                            destroySupplier.url(supplierToDelete.id),
                            {
                                preserveScroll: true,
                                onFinish: () => setSupplierToDelete(null),
                            },
                        )
                    }
                    onOpenChange={(open) => !open && setSupplierToDelete(null)}
                />
            )}
        </>
    );
}

SuppliersIndex.layout = {
    breadcrumbs: [{ title: 'Suppliers', href: suppliersIndex().url }],
};
