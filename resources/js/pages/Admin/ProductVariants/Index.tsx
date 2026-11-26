import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { index as productsIndex } from '@/actions/App/Http/Controllers/Admin/ProductController';
import {
    create as createVariant,
    destroy as destroyVariant,
    edit as editVariant,
} from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
import { show as variantPricing } from '@/actions/App/Http/Controllers/Admin/VariantPricingController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { formatCredits, formatSignedPercent } from '@/lib/wallet-credits';

type Product = {
    id: number;
    title: string;
    slug: string;
};

type Variant = {
    id: number;
    name: string;
    price_npr: number;
    purchase_price_npr: number | null;
    validity_months: number | null;
    supplier_cost_credits: string | null;
    supplier_name: string | null;
    /** What the supplier cost lands at today, from the variant's wallet. */
    current_cost_npr: number | null;
};

/**
 * How far today's landed cost has moved from the purchase price the variant
 * was priced against, once the gap is large enough to act on.
 */
function costDrift(variant: Variant): number | null {
    if (variant.current_cost_npr === null || !variant.purchase_price_npr) {
        return null;
    }

    const drift =
        (variant.current_cost_npr / variant.purchase_price_npr - 1) * 100;

    return Math.abs(drift) >= 2 ? drift : null;
}

export default function VariantsIndex({
    product,
    variants,
}: {
    product: Product;
    variants: Variant[];
}) {
    /**
     * The variant awaiting delete confirmation. A single dialog is driven by
     * this value rather than one dialog per row, so the table stays cheap to
     * render no matter how many variants the product has.
     */
    const [variantToDelete, setVariantToDelete] = useState<Variant | null>(
        null,
    );

    return (
        <>
            <SeoHead title={`Variants - ${product.title}`} />

            <PagePanel
                eyebrow="Product Variants"
                title={product.title}
                variant="transparent"
                actions={
                    <Button asChild>
                        <Link href={createVariant.url(product)}>
                            Add Variant
                        </Link>
                    </Button>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Selling Price</TableHead>
                            <TableHead>Purchase Price</TableHead>
                            <TableHead>Profit</TableHead>
                            <TableHead>Supplier Price</TableHead>
                            <TableHead>Validity</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants.map((variant) => (
                            <TableRow key={variant.id}>
                                <TableCell className="font-medium">
                                    {variant.name}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                    {formatNpr(variant.price_npr)}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                    {formatNpr(variant.purchase_price_npr ?? 0)}
                                    {costDrift(variant) !== null && (
                                        <div>
                                            <Badge
                                                variant={
                                                    (costDrift(variant) ?? 0) >
                                                    0
                                                        ? 'warning'
                                                        : 'info'
                                                }
                                                title={`Cost now: ${formatNpr(variant.current_cost_npr ?? 0)}`}
                                            >
                                                Cost{' '}
                                                {formatSignedPercent(
                                                    costDrift(variant) ?? 0,
                                                )}
                                            </Badge>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                    {variant.purchase_price_npr
                                        ? `${formatNpr(variant.price_npr - variant.purchase_price_npr)}${variant.price_npr > 0 ? ` · ${(((variant.price_npr - variant.purchase_price_npr) / variant.price_npr) * 100).toFixed(1)}%` : ''}`
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {variant.supplier_cost_credits ? (
                                        <>
                                            {formatCredits(
                                                variant.supplier_cost_credits,
                                            )}{' '}
                                            credits
                                            {variant.supplier_name && (
                                                <div className="text-xs text-muted-foreground">
                                                    {variant.supplier_name}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {!variant.validity_months
                                        ? 'One-time / Lifetime'
                                        : `${variant.validity_months} ${variant.validity_months === 1 ? 'month' : 'months'}`}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={variantPricing.url({
                                                product: product.slug,
                                                variant: variant.id,
                                            })}
                                        >
                                            Pricing
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={editVariant.url({
                                                product,
                                                variant,
                                            })}
                                        >
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() =>
                                            setVariantToDelete(variant)
                                        }
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {variants.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No variants found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>

            {variantToDelete && (
                <AlertDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setVariantToDelete(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete this variant?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This permanently removes the &ldquo;
                                {variantToDelete.name}&rdquo; variant from{' '}
                                {product.title} and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Form
                            {...destroyVariant.form({
                                product,
                                variant: variantToDelete,
                            })}
                            options={{ preserveScroll: true }}
                            onSuccess={() => setVariantToDelete(null)}
                        >
                            {({ processing }) => (
                                <AlertDialogFooter>
                                    <AlertDialogCancel type="button">
                                        Cancel
                                    </AlertDialogCancel>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={processing}
                                    >
                                        {processing ? 'Deleting…' : 'Delete'}
                                    </Button>
                                </AlertDialogFooter>
                            )}
                        </Form>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

VariantsIndex.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Variants', href: '#' },
    ],
};
