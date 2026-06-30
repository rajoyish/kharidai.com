import { Head, Link, router, usePage } from '@inertiajs/react';
import { Trash2, Plus, Minus } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';


type Product = {
    id: number;
    title: string;
    image: string;
};

type ProductVariant = {
    id: number;
    name: string;
    price_npr: string;
    product: Product;
};

type CartItem = {
    id: number;
    product_variant_id: number;
    quantity: number;
    product_variant: ProductVariant;
};

type Cart = {
    id: number;
    items: CartItem[];
};

export default function CartIndex({ cart }: { cart: Cart }) {
    const { auth, cartCount } = usePage().props;
    const handleUpdateQuantity = (item: CartItem, newQuantity: number) => {
        if (newQuantity < 1) {
return;
}

        router.put(
            `/cart/${item.id}`,
            { quantity: newQuantity },
            { preserveScroll: true },
        );
    };

    const handleRemove = (item: CartItem) => {
        router.delete(`/cart/${item.id}`, {
            preserveScroll: true,
        });
    };

    const totalNpr = (cart?.items || []).reduce((total, item) => {
        return (
            total + parseFloat(item.product_variant.price_npr) * item.quantity
        );
    }, 0);


    return (
        <>
            <Head title="Your Cart - Kharidai" />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <header className="border-b">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Link href="/" className="flex items-center gap-2 font-bold group">
                            <AppLogo className="h-9 w-auto transition-transform group-hover:scale-105" />
                        </Link>

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

                <main className="container mx-auto max-w-5xl flex-1 px-4 py-8">
                    <h1 className="mb-8 text-3xl font-bold tracking-tight">
                        Your Cart
                    </h1>

                    {cart.items.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/30 py-16 text-center">
                            <h2 className="mb-2 text-2xl font-semibold">
                                Your cart is empty
                            </h2>
                            <p className="mb-6 text-muted-foreground">
                                Looks like you haven't added anything to your
                                cart yet.
                            </p>
                            <Button asChild>
                                <Link href="/">Start Shopping</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            <div className="flex flex-col gap-4 lg:col-span-2">
                                {cart.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 rounded-lg border bg-card p-4 text-card-foreground"
                                    >
                                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded bg-muted">
                                            {item.product_variant.product
                                                .image ? (
                                                <img
                                                    src={`/storage/${item.product_variant.product.image}`}
                                                    alt={
                                                        item.product_variant
                                                            .product.title
                                                    }
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                                    No image
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold">
                                                        {
                                                            item.product_variant
                                                                .product.title
                                                        }
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {
                                                            item.product_variant
                                                                .name
                                                        }
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">
                                                        Rs.{' '}
                                                        {
                                                            item.product_variant
                                                                .price_npr
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3 rounded-md border bg-background px-2 py-1">
                                                    <button
                                                        onClick={() =>
                                                            handleUpdateQuantity(
                                                                item,
                                                                item.quantity -
                                                                    1,
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                                        disabled={
                                                            item.quantity <= 1
                                                        }
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-6 text-center text-sm font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            handleUpdateQuantity(
                                                                item,
                                                                item.quantity +
                                                                    1,
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleRemove(item)
                                                    }
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <div className="sticky top-6 rounded-lg border bg-card p-6 text-card-foreground">
                                    <h3 className="mb-4 text-lg font-semibold">
                                        Order Summary
                                    </h3>

                                    <div className="mb-6 space-y-3">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Subtotal (NPR)</span>
                                            <span className="font-medium text-foreground">
                                                Rs. {totalNpr.toFixed(0)}
                                            </span>
                                        </div>

                                    </div>

                                    <div className="mb-6 border-t pt-4">
                                        <p className="mb-4 text-sm text-muted-foreground">
                                            Taxes and shipping calculated at
                                            checkout.
                                        </p>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full"
                                        asChild
                                    >
                                        <Link href="/checkout">
                                            Proceed to Checkout
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
