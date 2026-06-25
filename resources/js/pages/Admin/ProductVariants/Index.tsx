import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { PagePanel } from '@/components/page-panel';

type Product = {
    id: number;
    title: string;
};

type Variant = {
    id: number;
    name: string;
    price_npr: string;
    price_usd: string;
    purchase_price_npr: string | null;
    purchase_price_usd: string | null;
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
            destroy(`/admin/products/${product.id}/variants/${variant.id}`);
        }
    };

    return (
        <>
            <Head title={`Variants - ${product.title}`} />

            <PagePanel
                title="Product Variants"
                variant="transparent"
                actions={
                    <Button asChild>
                        <Link href={`/admin/products/${product.id}/variants/create`}>
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
                            <TableHead>Selling Price (USD)</TableHead>
                            <TableHead>Purchase Price (USD)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants.map((variant) => (
                            <TableRow key={variant.id}>
                                <TableCell className="font-medium">
                                    {variant.name}
                                </TableCell>
                                <TableCell>
                                    {variant.price_npr}
                                </TableCell>
                                <TableCell>
                                    {variant.purchase_price_npr || '0.00'}
                                </TableCell>
                                <TableCell>
                                    {variant.price_usd}
                                </TableCell>
                                <TableCell>
                                    {variant.purchase_price_usd || '0.00'}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                    >
                                        <Link
                                            href={`/admin/products/${product.id}/variants/${variant.id}/edit`}
                                        >
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() =>
                                            handleDelete(variant)
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
                                    colSpan={6}
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
