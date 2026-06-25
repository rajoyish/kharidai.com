import { Head, Link, usePage, useForm } from '@inertiajs/react';
import { dashboard, login } from '@/routes';
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
    products,
    filters,
}: {
    products: Product[];
    filters: { search?: string };
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
                                    href={dashboard()}
                                    className="text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    Dashboard
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
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                className="group relative rounded-lg border bg-card p-4 text-card-foreground transition-shadow hover:shadow-lg"
                            >
                                <div className="mb-4 aspect-square w-full overflow-hidden rounded-md bg-muted">
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
                    {products.length === 0 && (
                        <div className="mt-12 text-center text-muted-foreground">
                            No products found matching your criteria.
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
