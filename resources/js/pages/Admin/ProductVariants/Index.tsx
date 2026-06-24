import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

type Product = {
    id: number;
    title: string;
};

type Variant = {
    id: number;
    name: string;
    price_npr: string;
    price_usd: string;
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
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/admin/products' },
                {
                    title: product.title,
                    href: `/admin/products/${product.id}/edit`,
                },
                {
                    title: 'Variants',
                    href: `/admin/products/${product.id}/variants`,
                },
            ]}
        >
            <Head title={`Variants - ${product.title}`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                        Variants for {product.title}
                    </h2>
                    <Button asChild>
                        <Link
                            href={`/admin/products/${product.id}/variants/create`}
                        >
                            Add Variant
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Price (NPR)</th>
                                <th className="px-6 py-3">Price (USD)</th>
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
                                        {variant.price_usd}
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
                </div>
            </div>
        </AppLayout>
    );
}
