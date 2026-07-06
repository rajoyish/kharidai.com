import { Link, useForm } from '@inertiajs/react';
import {
    create as createVariant,
    destroy as destroyVariant,
    edit as editVariant,
} from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
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
    const { delete: destroy } = useForm();

    const handleDelete = (variant: Variant) => {
        if (confirm('Are you sure you want to delete this variant?')) {
            destroy(destroyVariant.url({ product, variant }));
        }
    };

    return (
        <>
            <SeoHead title={`Variants - ${product.title}`} />

            <PagePanel
                title="Product Variants"
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
                                        onClick={() => handleDelete(variant)}
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
        </>
    );
}

VariantsIndex.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/admin/products' },
        { title: 'Variants', href: '#' },
    ],
};
