import { Head, Link, usePage, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
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
    filters,
}: {
    uncategorizedProducts: Product[];
    categories: { id: number; name: string; slug: string; products: Product[] }[];
    filters: { search?: string; category?: string };
}) {
    const { auth, cartCount } = usePage().props;
    const { data, setData, get } = useForm({
        search: filters.search || '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        get('/', { preserveState: true });
    };

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

                        <div className="mx-8 max-w-md flex-1">
                            <form
                                onSubmit={handleSearch}
                                className="flex gap-2"
                            >
                                <Input
                                    type="search"
                                    placeholder="Search products..."
                                    value={data.search}
                                    onChange={(e) =>
                                        setData('search', e.target.value)
                                    }
                                />
                                <Button type="submit">Search</Button>
                            </form>
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
                    {categories.map((category) => (
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

                    {uncategorizedProducts && uncategorizedProducts.length > 0 && (
                        <div className="mb-12">
                            <h2 className="mb-6 text-2xl font-bold tracking-tight border-b pb-2">
                                Other Products
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                                {uncategorizedProducts.map((product) => (
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

                    {categories.length === 0 && (!uncategorizedProducts || uncategorizedProducts.length === 0) && (
                        <div className="mt-12 text-center text-muted-foreground">
                            No products found matching your criteria.
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
