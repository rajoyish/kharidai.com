import { useForm } from '@inertiajs/react';
import { process as processCheckout } from '@/actions/App/Http/Controllers/CheckoutController';
import { FloatingContactActions } from '@/components/floating-contact-actions';
import { PaymentOptionToggle } from '@/components/payment-option-toggle';
import { SeoHead } from '@/components/seo-head';
import { ShippingSelector } from '@/components/shipping-selector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatNpr } from '@/lib/currency';

type Product = {
    id: number;
    title: string;
    image: string;
};

type ProductVariant = {
    id: number;
    name: string;
    price_npr: string;
    advance_payment_percent: number | null;
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

type Zone = {
    id: number;
    name: string;
    fee: number;
    min_days: number | null;
    max_days: number | null;
};

type SavedAddress = {
    id: number;
    recipient_name: string;
    mobile_number: string;
    address_line: string;
    city: string;
    landmark: string | null;
    shipping_zone_id: number | null;
};

export default function CheckoutIndex({
    cart,
    hasPhysicalItems,
    isPhysicalOnly,
    zones,
    addresses,
    primaryContact,
    itemsTotal,
    advanceTotal,
}: {
    cart: Cart;
    hasPhysicalItems: boolean;
    isPhysicalOnly: boolean;
    zones: Zone[];
    addresses: SavedAddress[];
    primaryContact: string | null;
    itemsTotal: number;
    advanceTotal: number;
}) {
    const { data, setData, post, processing, errors } = useForm({
        additional_data: '',
        shipping_zone_id: hasPhysicalItems
            ? (zones[0]?.id ?? '')
            : ('' as number | ''),
        recipient_name: '',
        primary_contact: primaryContact ?? '',
        alternate_contact: '',
        address_line: '',
        city: '',
        landmark: '',
        save_address: false as boolean,
        payment_option: 'full',
    });

    const selectedZone = zones.find(
        (zone) => zone.id === data.shipping_zone_id,
    );
    const shippingTotal = hasPhysicalItems ? (selectedZone?.fee ?? 0) : 0;
    const total = itemsTotal + shippingTotal;
    const amountDueNow =
        data.payment_option === 'shipping_only'
            ? shippingTotal
            : data.payment_option === 'advance'
              ? shippingTotal + advanceTotal
              : total;
    const balanceDue = total - amountDueNow;

    const handleSetData = (field: string, value: any) => {
        setData(field as any, value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(processCheckout.url());
    };

    return (
        <>
            <SeoHead title="Checkout" />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <main className="container mx-auto max-w-5xl flex-1 px-4 py-8">
                    <h1 className="mb-8 text-3xl font-bold tracking-tight">
                        Checkout
                    </h1>

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 gap-8 lg:grid-cols-3"
                    >
                        <div className="space-y-8 lg:col-span-2">
                            {hasPhysicalItems && (
                                <ShippingSelector
                                    data={data as any}
                                    setData={handleSetData}
                                    errors={errors}
                                    zones={zones}
                                    addresses={addresses}
                                />
                            )}

                            <PaymentOptionToggle
                                data={data as any}
                                setData={handleSetData}
                                errors={errors}
                                isPhysicalOnly={isPhysicalOnly}
                                itemsTotal={itemsTotal}
                                shippingTotal={shippingTotal}
                                advanceTotal={advanceTotal}
                            />

                            <div className="rounded-lg border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Additional Information (Optional)
                                </h2>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="additional_data"
                                        className="mb-2 inline-block"
                                    >
                                        Special Instructions or Account
                                        Information
                                    </Label>
                                    <Textarea
                                        id="additional_data"
                                        placeholder="Add any specific details required for this order (e.g. Account Information for top-ups)"
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
                                                {formatNpr(
                                                    parseFloat(
                                                        item.product_variant
                                                            .price_npr,
                                                    ) * item.quantity,
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-6 space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Subtotal
                                        </span>
                                        <span>{formatNpr(itemsTotal)}</span>
                                    </div>
                                    {hasPhysicalItems && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Shipping
                                            </span>
                                            <span>
                                                {formatNpr(shippingTotal)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-2 text-lg font-bold">
                                        <span>Total</span>
                                        <span>{formatNpr(total)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-primary">
                                        <span>Pay now</span>
                                        <span>{formatNpr(amountDueNow)}</span>
                                    </div>
                                    {balanceDue > 0 && (
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Due on delivery</span>
                                            <span>{formatNpr(balanceDue)}</span>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-fit"
                                    disabled={processing}
                                >
                                    Place Order
                                </Button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
            <FloatingContactActions />
        </>
    );
}
