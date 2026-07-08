import { Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    create,
    destroy as destroyProduct,
    edit,
    index as productsIndex,
    toggleStock,
} from '@/actions/App/Http/Controllers/Admin/ProductController';
import { index as productVariants } from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { TruncatedText } from '@/components/truncated-text';
import { Badge } from '@/components/ui/badge';
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
import { show as showStorefrontProduct } from '@/routes/products';

type Product = {
    id: number;
    title: string;
    description: string;
    image: string;
    slug: string;
    in_stock: boolean;
    categories?: {
        id: number;
        name: string;
    }[];
};

const PRODUCT_IMAGE_COLUMN_CLASSES = 'w-22 min-w-22 max-w-22 px-4';
const PRODUCT_STATUS_COLUMN_CLASSES = 'w-33 min-w-33';

export default function ProductsIndex({ products }: { products: Product[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingProductId, setDeletingProductId] = useState<number | null>(
        null,
    );

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) {
            return products;
        }

        const query = searchQuery.toLowerCase();

        return products.filter((p) => p.title.toLowerCase().includes(query));
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
            <SeoHead title="Products Management" />

            <PagePanel
                title="Products"
                variant="transparent"
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Button asChild className="w-fit">
                            <Link href={create()}>Add Product</Link>
                        </Button>
                    </div>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className={PRODUCT_IMAGE_COLUMN_CLASSES}>
                                Image
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead
                                className={PRODUCT_STATUS_COLUMN_CLASSES}
                            >
                                Status
                            </TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell
                                    className={PRODUCT_IMAGE_COLUMN_CLASSES}
                                >
                                    {product.image ? (
                                        <img
                                            src={`/storage/${product.image}`}
                                            alt={product.title}
                                            className="h-10 w-10 rounded object-cover shadow-sm"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                                            <span className="text-xs">
                                                No img
                                            </span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-50 font-medium sm:max-w-[200px] md:max-w-[300px] lg:max-w-[400px]">
                                    <TruncatedText>
                                        {product.title}
                                    </TruncatedText>
                                </TableCell>
                                <TableCell>
                                    {product.categories &&
                                    product.categories.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {product.categories.map(
                                                (category) => (
                                                    <Badge
                                                        key={category.id}
                                                        variant="secondary"
                                                    >
                                                        {category.name}
                                                    </Badge>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">
                                            Uncategorized
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell
                                    className={PRODUCT_STATUS_COLUMN_CLASSES}
                                >
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                    >
                                        {product.in_stock
                                            ? 'In Stock'
                                            : 'Out of Stock'}
                                    </span>
                                </TableCell>
                                <TableCell className="flex h-18 items-center justify-end gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs hover:bg-muted"
                                        asChild
                                    >
                                        <a
                                            href={showStorefrontProduct.url(
                                                product,
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View
                                        </a>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-8 px-2 text-xs ${product.in_stock ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700' : 'text-green-600 hover:bg-green-50 hover:text-green-700'}`}
                                        onClick={() =>
                                            router.patch(
                                                toggleStock(product).url,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {product.in_stock
                                            ? 'Unlist'
                                            : 'Restock'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs hover:bg-muted"
                                        asChild
                                    >
                                        <Link href={productVariants(product)}>
                                            Variants
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs hover:bg-muted"
                                        asChild
                                    >
                                        <Link href={edit(product)}>Edit</Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                        disabled={
                                            deletingProductId === product.id
                                        }
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
                                    {products.length === 0
                                        ? 'No products found.'
                                        : 'No products match your search.'}
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
    breadcrumbs: [{ title: 'Products', href: productsIndex().url }],
};
