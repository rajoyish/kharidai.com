import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

import { PagePanel } from '@/components/page-panel';

type Product = {
    id: number;
    title: string;
    description: string;
    image: string;
    in_stock: boolean;
};

export default function ProductsIndex({ products }: { products: Product[] }) {
    const { delete: destroy } = useForm();

    const handleDelete = (product: Product) => {
        if (confirm('Are you sure you want to delete this product?')) {
            destroy(`/admin/products/${product.id}`);
        }
    };

    return (
        <>
            <Head title="Products Management" />

            <PagePanel
                title="Products"
                actions={
                    <Button asChild>
                        <Link href="/admin/products/create">Add Product</Link>
                    </Button>
                }
            >
                <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Image</th>
                                <th className="px-6 py-3">Title</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr
                                    key={product.id}
                                    className="border-b last:border-0"
                                >
                                    <td className="px-6 py-4">
                                        {product.image && (
                                            <img
                                                src={`/storage/${product.image}`}
                                                alt={product.title}
                                                className="h-12 w-12 rounded object-cover"
                                            />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {product.title}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.in_stock ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                    </td>
                                    <td className="flex gap-2 px-6 py-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={product.in_stock ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                                            onClick={() => router.patch(`/admin/products/${product.id}/toggle-stock`, {}, { preserveScroll: true })}
                                        >
                                            {product.in_stock ? 'Unlist' : 'Restock'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/admin/products/${product.id}/variants`}
                                            >
                                                Variants
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/admin/products/${product.id}/edit`}
                                            >
                                                Edit
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                handleDelete(product)
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-6 py-4 text-center text-muted-foreground"
                                    >
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
            </PagePanel>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [{ title: 'Products', href: '/admin/products' }],
};
