import { Head, Link, usePage, useForm } from '@inertiajs/react';
import { dashboard, login } from '@/routes';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type Variant = {
    id: number;
    name: string;
    details: string | null;
    price_npr: string;
    price_usd: string;
};

type Product = {
    id: number;
    title: string;
    description: string;
    image: string;
    variants: Variant[];
};

export default function Show({ product }: { product: Product }) {
    const { auth, cartCount } = usePage().props;
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
        product.variants.length > 0 ? product.variants[0] : null,
    );

    const { data, setData, post, processing } = useForm({
        product_variant_id: selectedVariant?.id,
        quantity: 1,
    });

    const handleAddToCart = () => {
        if (!selectedVariant) return;

        post('/cart', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Added to cart');
            },
        });
    };

    // Update form data when variant changes
    const handleVariantChange = (variant: Variant) => {
        setSelectedVariant(variant);
        setData('product_variant_id', variant.id);
    };

    return (
        <>
            <Head title={`${product.title} - Kharidai`} />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <header className="border-b">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Link
                            href="/"
                            className="text-2xl font-bold tracking-tighter"
                        >
                            Kharidai
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
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
                        {/* Product Image */}
                        <div className="aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                            {product.image ? (
                                <img
                                    src={`/storage/${product.image}`}
                                    alt={product.title}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    No image available
                                </div>
                            )}
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-col">
                            <h1 className="mb-2 text-3xl font-bold tracking-tight">
                                {product.title}
                            </h1>

                            {auth.user && selectedVariant && (
                                <div className="mb-6 text-2xl font-semibold text-primary">
                                    Rs. {selectedVariant.price_npr} / $
                                    {selectedVariant.price_usd}
                                </div>
                            )}

                            <div className="prose dark:prose-invert mb-8 max-w-none text-muted-foreground">
                                <p>{product.description}</p>
                            </div>

                            {/* Variants Selection */}
                            {auth.user && product.variants.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="mb-3 text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                        Select Variant
                                    </h3>
                                    <RadioGroup
                                        value={selectedVariant?.id.toString()}
                                        onValueChange={(value) => {
                                            const variant =
                                                product.variants.find(
                                                    (v) =>
                                                        v.id.toString() ===
                                                        value,
                                                );
                                            if (variant)
                                                handleVariantChange(variant);
                                        }}
                                        className="grid gap-4"
                                    >
                                        {product.variants.map((variant) => (
                                            <Label
                                                key={variant.id}
                                                htmlFor={`variant-${variant.id}`}
                                                className="flex cursor-pointer items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                                            >
                                                <div className="mr-4 flex flex-col gap-1">
                                                    <span className="text-base font-semibold">
                                                        {variant.name}
                                                    </span>
                                                    {variant.details && (
                                                        <span className="text-sm font-normal text-muted-foreground">
                                                            {variant.details}
                                                        </span>
                                                    )}
                                                </div>
                                                <RadioGroupItem
                                                    value={variant.id.toString()}
                                                    id={`variant-${variant.id}`}
                                                />
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                            {/* Add to Cart Actions */}
                            <div className="mt-auto flex flex-col gap-4">
                                <Button
                                    size="lg"
                                    className="h-14 w-full text-lg"
                                    onClick={handleAddToCart}
                                    disabled={
                                        processing ||
                                        !selectedVariant ||
                                        !auth.user
                                    }
                                >
                                    {auth.user
                                        ? 'Add to Cart'
                                        : 'Log in to Add to Cart'}
                                </Button>
                                {!auth.user && (
                                    <p className="text-center text-sm text-muted-foreground">
                                        You must{' '}
                                        <a
                                            href="/auth/google"
                                            className="text-foreground underline underline-offset-4"
                                        >
                                            log in
                                        </a>{' '}
                                        to purchase this product.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
