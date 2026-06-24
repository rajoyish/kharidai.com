import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

type Product = {
    id: number;
    title: string;
    description: string;
    image: string;
};

export default function ProductsIndex({ products }: { products: Product[] }) {
    const { delete: destroy } = useForm();

    const handleDelete = (product: Product) => {
        if (confirm('Are you sure you want to delete this product?')) {
            destroy(`/admin/products/${product.id}`);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Products', href: '/admin/products' }]}
        >
            <Head title="Products Management" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Products</h2>
                    <Button asChild>
                        <Link href="/admin/products/create">Add Product</Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Image</th>
                                <th className="px-6 py-3">Title</th>
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
                                    <td className="flex gap-2 px-6 py-4">
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
                </div>
            </div>
        </AppLayout>
    );
}
