import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

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
                title={`Variants for ${product.title}`}
                actions={
                    <Button asChild>
                        <Link
                            href={`/admin/products/${product.id}/variants/create`}
                        >
                            Add Variant
                        </Link>
                    </Button>
                }
            >
                <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Selling Price (NPR)</th>
                                <th className="px-6 py-3">Purchase Price (NPR)</th>
                                <th className="px-6 py-3">Selling Price (USD)</th>
                                <th className="px-6 py-3">Purchase Price (USD)</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map((variant) => (
                                <tr
                                    key={variant.id}
                                    className="border-b last:border-0"
                                >
                                    <td className="px-6 py-4 font-medium">
                                        {variant.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        {variant.price_npr}
                                    </td>
                                    <td className="px-6 py-4">
                                        {variant.purchase_price_npr || '0.00'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {variant.price_usd}
                                    </td>
                                    <td className="px-6 py-4">
                                        {variant.purchase_price_usd || '0.00'}
                                    </td>
                                    <td className="flex gap-2 px-6 py-4">
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
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                handleDelete(variant)
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {variants.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-4 text-center text-muted-foreground"
                                    >
                                        No variants found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
