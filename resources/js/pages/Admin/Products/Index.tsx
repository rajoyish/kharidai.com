import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { destroy as destroyProduct } from '@/actions/App/Http/Controllers/Admin/ProductController';
import { PagePanel } from '@/components/page-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    description: string;
    image: string;
    slug: string;
    in_stock: boolean;
    category?: {
        name: string;
    };
};

export default function ProductsIndex({ products }: { products: Product[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) {
            return products;
        }

        const query = searchQuery.toLowerCase();

        return products.filter((p) =>
            p.title.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

    const handleDelete = (product: Product) => {
        if (confirm('Are you sure you want to delete this product?')) {
            setDeletingProductId(product.id);

            router.delete(destroyProduct(product), {
                preserveScroll: true,
                onFinish: () => {
                    setDeletingProductId(null);
                },
            });
        }
    };

    return (
        <>
            <Head title="Products Management" />

            <PagePanel
                title="Products"
                variant="transparent"
                actions={
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/admin/products/create">Add Product</Link>
                        </Button>
                    </div>
                }
            >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        {product.image ? (
                                            <img
                                                src={`/storage/${product.image}`}
                                                alt={product.title}
                                                className="h-10 w-10 rounded object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                                <span className="text-xs">No img</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium truncate max-w-[200px] sm:max-w-none">
                                        {product.title}
                                    </TableCell>
                                    <TableCell>
                                        {product.category?.name || <span className="text-muted-foreground italic text-xs">Uncategorized</span>}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.in_stock ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex items-center justify-end gap-1.5 h-[72px]">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`h-8 px-2 text-xs ${product.in_stock ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                                            onClick={() => router.patch(`/admin/products/${product.slug}/toggle-stock`, {}, { preserveScroll: true })}
                                        >
                                            {product.in_stock ? 'Unlist' : 'Restock'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs hover:bg-muted"
                                            asChild
                                        >
                                            <Link href={`/admin/products/${product.slug}/variants`}>
                                                Variants
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs hover:bg-muted"
                                            asChild
                                        >
                                            <Link href={`/admin/products/${product.slug}/edit`}>
                                                Edit
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                            disabled={deletingProductId === product.id}
                                            onClick={() => handleDelete(product)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredProducts.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {products.length === 0 ? 'No products found.' : 'No products match your search.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
            </PagePanel>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [{ title: 'Products', href: '/admin/products' }],
};
