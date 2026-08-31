import { Link, router } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { process as processCheckout } from '@/actions/App/Http/Controllers/CheckoutController';
import { FloatingContactActions } from '@/components/floating-contact-actions';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { formatNpr } from '@/lib/currency';
import { home } from '@/routes';
import {
    remove as removeCartItem,
    update as updateCartItem,
} from '@/routes/cart';
import { index as checkoutIndex } from '@/routes/checkout';

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
    quantity: number;
    selected_options: { color?: string; size?: string } | null;
    product_variant: ProductVariant;
};

type Cart = {
    id: number;
    items: CartItem[];
};

/**
 * The only props a quantity change can alter. Asking for them by name keeps the
 * server from rebuilding the rest of the page's props on every click.
 */
const QUANTITY_PROPS = ['cart', 'canCheckoutDirectly', 'cartCount'];

export default function CartIndex({
    cart,
    canCheckoutDirectly,
}: {
    cart: Cart;
    canCheckoutDirectly: boolean;
}) {
    const [placing, setPlacing] = useState(false);
    const [removing, setRemoving] = useState<number[]>([]);

    // Quantities the shopper has clicked but the server has not confirmed yet.
    // The buttons read from here so the number, the line total and the subtotal
    // move on the click rather than after the round trip.
    const [draftQuantities, setDraftQuantities] = useState<
        Record<number, number>
    >({});

    // One request per item at a time. Clicks that land while a request is in
    // flight collapse into a single follow-up carrying the latest value, so
    // holding down "+" costs two requests instead of one per press.
    const inFlight = useRef<Set<number>>(new Set());
    const queued = useRef<Map<number, number>>(new Map());

    const quantityOf = (item: CartItem) =>
        draftQuantities[item.id] ?? item.quantity;

    const settleDraft = (itemId: number) => {
        setDraftQuantities((current) => {
            if (!(itemId in current)) {
                return current;
            }

            const next = { ...current };
            delete next[itemId];

            return next;
        });
    };

    const syncQuantity = (item: CartItem, quantity: number) => {
        if (inFlight.current.has(item.id)) {
            queued.current.set(item.id, quantity);

            return;
        }

        inFlight.current.add(item.id);

        router.put(
            updateCartItem.url(item),
            { quantity },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: QUANTITY_PROPS,
                onFinish: () => {
                    inFlight.current.delete(item.id);

                    const pending = queued.current.get(item.id);

                    if (pending !== undefined) {
                        queued.current.delete(item.id);
                        syncQuantity(item, pending);

                        return;
                    }

                    // Nothing newer is waiting, so the props now carry the
                    // settled quantity and the draft has nothing left to say.
                    // Dropping it here also reverts the number if the request
                    // failed, rather than leaving a lie on screen.
                    settleDraft(item.id);
                },
            },
        );
    };

    const handlePlaceOrder = () => {
        router.post(
            processCheckout.url(),
            {},
            {
                onStart: () => setPlacing(true),
                onFinish: () => setPlacing(false),
            },
        );
    };

    const handleUpdateQuantity = (item: CartItem, newQuantity: number) => {
        if (newQuantity < 1) {
            return;
        }

        setDraftQuantities((current) => ({
            ...current,
            [item.id]: newQuantity,
        }));

        syncQuantity(item, newQuantity);
    };

    const handleRemove = (item: CartItem) => {
        setRemoving((current) => [...current, item.id]);

        router.delete(removeCartItem.url(item), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            only: QUANTITY_PROPS,
            onFinish: () =>
                setRemoving((current) =>
                    current.filter((id) => id !== item.id),
                ),
        });
    };

    const totalNpr = (cart?.items || []).reduce((total, item) => {
        return (
            total +
            parseFloat(item.product_variant.price_npr) * quantityOf(item)
        );
    }, 0);

    return (
        <>
            <SeoHead title="Your Cart" />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
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
                                <Link href={home()}>Start Shopping</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            <div className="flex flex-col gap-4 lg:col-span-2">
                                {cart.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`flex gap-4 rounded-lg border bg-card p-4 text-card-foreground ${
                                            removing.includes(item.id)
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                        }`}
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
                                                    {(item.selected_options
                                                        ?.color ||
                                                        item.selected_options
                                                            ?.size) && (
                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                            {item
                                                                .selected_options
                                                                ?.color && (
                                                                <span className="rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                                    Color:{' '}
                                                                    {
                                                                        item
                                                                            .selected_options
                                                                            .color
                                                                    }
                                                                </span>
                                                            )}
                                                            {item
                                                                .selected_options
                                                                ?.size && (
                                                                <span className="rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                                    Size:{' '}
                                                                    {
                                                                        item
                                                                            .selected_options
                                                                            .size
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">
                                                        {formatNpr(
                                                            item.product_variant
                                                                .price_npr,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3 rounded-md border bg-background px-2 py-1">
                                                    <button
                                                        type="button"
                                                        aria-label="Decrease quantity"
                                                        onClick={() =>
                                                            handleUpdateQuantity(
                                                                item,
                                                                quantityOf(
                                                                    item,
                                                                ) - 1,
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                                        disabled={
                                                            quantityOf(item) <=
                                                            1
                                                        }
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-6 text-center text-sm font-medium">
                                                        {quantityOf(item)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        aria-label="Increase quantity"
                                                        onClick={() =>
                                                            handleUpdateQuantity(
                                                                item,
                                                                quantityOf(
                                                                    item,
                                                                ) + 1,
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
                                                    disabled={removing.includes(
                                                        item.id,
                                                    )}
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
                                                {formatNpr(totalNpr)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-6 border-t pt-4">
                                        <p className="mb-4 text-sm text-muted-foreground">
                                            {canCheckoutDirectly
                                                ? 'No payment required. Your order will be placed right away.'
                                                : 'Taxes and shipping calculated at checkout.'}
                                        </p>
                                    </div>

                                    {canCheckoutDirectly ? (
                                        <Button
                                            size="lg"
                                            className="w-fit"
                                            disabled={placing}
                                            onClick={handlePlaceOrder}
                                        >
                                            {placing
                                                ? 'Placing Order…'
                                                : 'Place Order'}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="lg"
                                            className="w-fit"
                                            asChild
                                        >
                                            <Link href={checkoutIndex()}>
                                                Proceed to Checkout
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            <FloatingContactActions />
        </>
    );
}
