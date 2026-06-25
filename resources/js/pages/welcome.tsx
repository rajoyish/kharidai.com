import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

type Product = {
    id: number;
    title: string;
    description: string;
    image: string;
    variants: Variant[];
};

type Variant = {
    id: number;
    name: string;
    price_npr: string;
    price_usd: string;
};

export default function Welcome({
    uncategorizedProducts,
    categories,
}: {
    uncategorizedProducts: Product[];
    categories: { id: number; name: string; slug: string; products: Product[] }[];
}) {
    const { auth, cartCount } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const { filteredCategories, filteredUncategorizedProducts } = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        
        let cats = categories;
        let uncategorized = uncategorizedProducts;

        // Filter by selected category dropdown
        if (selectedCategory !== 'all') {
            cats = cats.filter(c => c.id.toString() === selectedCategory);
            uncategorized = []; // If a specific category is selected, uncategorized products are hidden
        }

        // Filter by search query
        if (query) {
            cats = cats.map(category => ({
                ...category,
                products: category.products.filter(p => 
                    p.title.toLowerCase().includes(query) || 
                    (p.description && p.description.toLowerCase().includes(query))
                )
            })).filter(category => category.products.length > 0);

            uncategorized = uncategorized.filter(p => 
                p.title.toLowerCase().includes(query) || 
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        return { filteredCategories: cats, filteredUncategorizedProducts: uncategorized };
    }, [categories, uncategorizedProducts, searchQuery, selectedCategory]);

    return (
        <>
            <Head title="Kharidai - Store" />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <header className="border-b">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Link
                            href="/"
                            className="text-2xl font-bold tracking-tighter"
                        >
                            Kharidai
                        </Link>

                        <div className="mx-8 max-w-md flex-1 hidden md:block">
                            {/* Empty space for layout balance */}
                        </div>

                        <nav className="flex items-center gap-4">
                            <Link
                                href="/cart"
                                className="mr-4 flex items-center text-sm font-medium underline-offset-4 hover:underline"
                            >
                                Cart
                                {(cartCount as number) > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                        {cartCount as number}
                                    </span>
                                )}
                            </Link>
                            {auth.user ? (
                                <Link
                                    href={auth.user.is_admin ? '/admin' : '/orders'}
                                    className="text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    {auth.user.is_admin ? 'Admin' : 'My Orders'}
                                </Link>
                            ) : (
                                <a
                                    href="/auth/google"
                                    className="text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    Log in
                                </a>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="container mx-auto flex-1 px-4 py-8">
                    {/* Search and Filter */}
                    <div className="mb-12 flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                        <Input
                            type="search"
                            placeholder="Search products by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                        />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="flex h-9 w-full sm:w-64 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id.toString()}>{category.name}</option>
                            ))}
                        </select>
                    </div>

                    {filteredCategories.map((category) => (
                        category.products && category.products.length > 0 && (
                            <div key={category.id} className="mb-12">
                                <h2 className="mb-6 text-2xl font-bold tracking-tight border-b pb-2">
                                    {category.name}
                                </h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                                    {category.products.map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/products/${product.id}`}
                                            className="group relative rounded-lg border bg-card p-4 text-card-foreground transition-shadow hover:shadow-lg"
                                        >
                                            <div className="mb-4 aspect-video w-full overflow-hidden rounded-md bg-muted">
                                                {product.image ? (
                                                    <img
                                                        src={`/storage/${product.image}`}
                                                        alt={product.title}
                                                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                        No image
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-semibold">
                                                {product.title}
                                            </h3>
                                            {product.variants &&
                                                product.variants.length > 0 && (
                                                    <div className="mt-2 text-sm text-muted-foreground">
                                                        Starting at Rs.{' '}
                                                        {product.variants[0].price_npr} / $
                                                        {product.variants[0].price_usd}
                                                    </div>
                                                )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}

                    {filteredUncategorizedProducts && filteredUncategorizedProducts.length > 0 && (
                        <div className="mb-12">
                            <h2 className="mb-6 text-2xl font-bold tracking-tight border-b pb-2">
                                Other Products
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                                {filteredUncategorizedProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.id}`}
                                        className="group relative rounded-lg border bg-card p-4 text-card-foreground transition-shadow hover:shadow-lg"
                                    >
                                        <div className="mb-4 aspect-video w-full overflow-hidden rounded-md bg-muted">
                                            {product.image ? (
                                                <img
                                                    src={`/storage/${product.image}`}
                                                    alt={product.title}
                                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold">
                                            {product.title}
                                        </h3>
                                        {product.variants &&
                                            product.variants.length > 0 && (
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                    Starting at Rs.{' '}
                                                    {product.variants[0].price_npr} / $
                                                    {product.variants[0].price_usd}
                                                </div>
                                            )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredCategories.length === 0 && (!filteredUncategorizedProducts || filteredUncategorizedProducts.length === 0) && (
                        <div className="mt-12 text-center text-muted-foreground">
                            No products found matching your criteria.
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
