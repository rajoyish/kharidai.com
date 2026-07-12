import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { index as productsIndex } from '@/actions/App/Http/Controllers/Admin/ProductController';
import {
    create as createVariant,
    destroy as destroyVariant,
    edit as editVariant,
} from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
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
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Product = {
    id: number;
    title: string;
    slug: string;
};

type Variant = {
    id: number;
    name: string;
    price_npr: string;
    purchase_price_npr: string | null;
    validity_days: number | null;
};

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
                            <TableHead>Selling Price (NPR)</TableHead>
                            <TableHead>Purchase Price (NPR)</TableHead>
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
                                <TableCell>{variant.price_npr}</TableCell>
                                <TableCell>
                                    {variant.purchase_price_npr || '0.00'}
                                </TableCell>
                                <TableCell>
                                    {!variant.validity_days
                                        ? 'One-time / Lifetime'
                                        : `${variant.validity_days} days`}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
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
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
                                    colSpan={5}
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
