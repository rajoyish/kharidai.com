import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

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

export default function CheckoutIndex({ cart }: { cart: Cart }) {
    const { data, setData, post, processing, errors } = useForm({
        additional_data: '',
    });

    const totalNpr = cart.items.reduce((total, item) => {
        return (
            total + parseFloat(item.product_variant.price_npr) * item.quantity
        );
    }, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/checkout');
    };

    return (
        <>
            <Head title="Checkout - Kharidai" />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <header className="border-b">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Link href="/" className="flex items-center gap-3 group">
                            <img src="/images/logo.webp" alt="Kharidai" className="h-9 transition-transform group-hover:scale-105" />
                            <span className="sr-only">Kharidai</span>
                        </Link>
                    </div>
                </header>

                <main className="container mx-auto max-w-5xl flex-1 px-4 py-8">
                    <h1 className="mb-8 text-3xl font-bold tracking-tight">
                        Checkout
                    </h1>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 gap-8 lg:grid-cols-3"
                    >
                        <div className="space-y-8 lg:col-span-2">
                            <div className="rounded-lg border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Payment Method
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-2 rounded-md border p-4">
                                        <Label
                                            className="flex-1 cursor-default font-medium"
                                        >
                                            Pay via QR (NPR)
                                            <p className="mt-1 text-sm font-normal text-muted-foreground">
                                                Manual payment via local
                                                bank/wallet transfer.
                                            </p>
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Additional Information (Optional)
                                </h2>
                                <div className="space-y-2">
                                    <Label htmlFor="additional_data" className='inline-block mb-2'>
                                        Special Instructions or Account Information
                                    </Label>
                                    <Textarea
                                        id="additional_data"
                                        placeholder="Add any specific details required for this order (e.g.  Account Information for top-ups)"
                                        value={data.additional_data}
                                        onChange={(e) =>
                                            setData(
                                                'additional_data',
                                                e.target.value,
                                            )
                                        }
                                        rows={4}
                                    />
                                </div>
                                {errors.additional_data && (
                                    <div className="mt-2 text-sm text-destructive">
                                        {errors.additional_data}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="sticky top-6 rounded-lg border bg-card p-6 text-card-foreground">
                                <h3 className="mb-4 text-lg font-semibold">
                                    Order Summary
                                </h3>

                                <div className="mb-6 space-y-4">
                                    {cart.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                {item.quantity}x{' '}
                                                {
                                                    item.product_variant.product
                                                        .title
                                                }{' '}
                                                ({item.product_variant.name})
                                            </span>
                                            <span className="text-right font-medium">
                                                {`Rs. ${(parseFloat(item.product_variant.price_npr) * item.quantity).toFixed(2)}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-6 space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span>
                                            {`Rs. ${totalNpr.toFixed(2)}`}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full"
                                    disabled={processing}
                                >
                                    Place Order
                                </Button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
}
