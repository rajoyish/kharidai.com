import { Link, useForm, usePage } from '@inertiajs/react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { add as addToCart } from '@/actions/App/Http/Controllers/CartController';
import { JsonLd } from '@/components/json-ld';
import { LightboxImageAnchor, shouldOpenLightboxFromClick } from '@/components/lightbox-image-link';
import { ProductDescription } from '@/components/product-description';
import { SeoHead } from '@/components/seo-head';
import { ServiceBriefForm } from '@/components/service-brief-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { login } from '@/routes';
import type { PageProps } from '@/types';

const ImageLightbox = lazy(() => import('@/components/image-lightbox'));

/** Drop trailing ".00" so whole-rupee prices read cleanly (e.g. "2160.00" → "2160"). */
function formatNpr(value: string): string {
    const amount = Number(value);

    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

/** Price with a small muted "Rs." and a large bold amount, matching the variant header. */
function VariantPrice({ value }: { value: string }) {
    return (
        <div className="flex items-baseline gap-1 leading-none">
            <span className="text-base font-medium text-muted-foreground">
                Rs.
            </span>
            <span className="text-3xl font-bold tracking-tight">
                {formatNpr(value)}
            </span>
        </div>
    );
}

type Variant = {
    id: number;
    name: string;
    details: string | null;
    price_npr: string;
};

type ProductGallery = {
    id: number;
    image_path: string;
    sort_order: number;
};

type Product = {
    id: number;
    title: string;
    description: string | null;
    image: string | null;
    type: string;
    variants: Variant[];
    galleries?: ProductGallery[];
    physical_detail?: { weight_grams: number | null; free_shipping: boolean; } | null;
    service_detail?: { delivery_days: number | null; revisions: number | null; requires_brief: boolean; } | null;
};

export default function Show({
    product,
}: {
    product: Product;
}) {
    const { auth, seo } = usePage<PageProps>().props;
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
        product.variants.length > 0 ? product.variants[0] : null,
    );

    const galleryImages = useMemo(() => {
        return (product.galleries ?? []).map((img) => `/storage/${img.image_path}`);
    }, [product.galleries]);

    const allImages = useMemo(() => {
        return product.image
            ? [`/storage/${product.image}`, ...galleryImages]
            : galleryImages;
    }, [product.image, galleryImages]);

    const [mainImageIndex, setMainImageIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const requiresBrief =
        product.type === 'service' && !!product.service_detail?.requires_brief;

    // A service is priced after the work is scoped, so its default unit carries
    // no upfront price: show it as "price on request" and skip the single-option
    // variant picker. Multi-package services still let the customer choose.
    const showVariantSelector =
        product.type === 'service'
            ? product.variants.length > 1
            : product.variants.length > 0;
    const showPrice =
        !!selectedVariant && Number(selectedVariant.price_npr) > 0;

    const { data, setData, post, processing, transform } = useForm({
        product_variant_id: selectedVariant?.id,
        quantity: 1,
        brief: '',
    });

    // Only submit the brief for services that require it; otherwise send null.
    transform((formData) => ({
        ...formData,
        brief: requiresBrief ? formData.brief : null,
    }));

    const handleAddToCart = () => {
        if (!selectedVariant) {
            return;
        }

        if (requiresBrief && !data.brief.trim()) {
            toast.error(
                'Please provide brief information before adding to cart.',
            );

            return;
        }

        post(addToCart.url(), {
            only: ['cartCount', 'errors'],
            preserveScroll: true,
            preserveState: true,
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
            <SeoHead />
            {selectedVariant && (
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'Product',
                        name: product.title,
                        image: seo.image,
                        description: seo.description,
                        offers: {
                            '@type': 'Offer',
                            priceCurrency: 'NPR',
                            price: selectedVariant?.price_npr || '0.00',
                            availability: 'https://schema.org/InStock',
                            url: seo.url,
                        },
                    }}
                />
            )}
                <main className="container mx-auto flex-1 px-4 py-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
                        <div className="order-1 flex flex-col gap-8 md:order-2">
                            {/* Mobile Title & Price (Hidden on Desktop) */}
                            <div className="flex flex-col md:hidden">
                                <h1 className="mb-2 text-3xl font-bold tracking-tight">
                                    {product.title}
                                </h1>

                                {auth.user && showPrice && !showVariantSelector && (
                                    <div className="text-2xl font-semibold text-primary">
                                        Rs. {selectedVariant?.price_npr}
                                    </div>
                                )}
                            </div>

                            {/* Main Image */}
                            {product.image || galleryImages.length > 0 ? (
                                <LightboxImageAnchor
                                    src={product.image ? `/storage/${product.image}` : galleryImages[0]}
                                    alt={product.title}
                                    ariaLabel={`View main image for ${product.title}`}
                                    className="aspect-[1200/630] w-full overflow-hidden rounded-lg border bg-muted"
                                    imageClassName="h-full w-full object-cover transition-opacity hover:opacity-90"
                                    onClick={(event) => {
                                        if (!shouldOpenLightboxFromClick(event)) {
                                            return;
                                        }

                                        event.preventDefault();
                                        setMainImageIndex(0);
                                        setLightboxOpen(true);
                                    }}
                                />
                            ) : (
                                <div className="flex aspect-[1200/630] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
                                    <span className="text-sm font-medium">No image available</span>
                                </div>
                            )}

                            {/* Lightbox */}
                            {lightboxOpen && (
                                <Suspense fallback={null}>
                                    <ImageLightbox
                                        open={lightboxOpen}
                                        close={() => setLightboxOpen(false)}
                                        slides={allImages.map((src) => ({ src }))}
                                        index={mainImageIndex}
                                    />
                                </Suspense>
                            )}

                            {/* Variants Selection */}
                            {auth.user && showVariantSelector && (
                                <div>
                                    <div className="mb-3 flex items-baseline justify-between gap-4">
                                        <h3 className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                            Select Variant
                                        </h3>
                                        {showPrice && selectedVariant && (
                                            <VariantPrice
                                                value={selectedVariant.price_npr}
                                            />
                                        )}
                                    </div>
                                    <RadioGroup
                                        value={selectedVariant?.id.toString()}
                                        onValueChange={(value) => {
                                            const variant =
                                                product.variants.find(
                                                    (v) =>
                                                        v.id.toString() ===
                                                        value,
                                                );

                                            if (variant) {
                                                handleVariantChange(variant);
                                            }
                                        }}
                                        className="grid gap-4"
                                    >
                                        {product.variants.map((variant) => (
                                            <Label
                                                key={variant.id}
                                                htmlFor={`variant-${variant.id}`}
                                                className="flex cursor-pointer flex-col rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span className="text-base font-semibold">
                                                        {variant.name}
                                                    </span>
                                                    <RadioGroupItem
                                                        value={variant.id.toString()}
                                                        id={`variant-${variant.id}`}
                                                    />
                                                </div>
                                                {variant.details && (
                                                    <span className="mt-1 text-sm font-normal text-muted-foreground">
                                                        {variant.details}
                                                    </span>
                                                )}
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                            {auth.user && product.type === 'service' && product.service_detail?.requires_brief && (
                                <ServiceBriefForm brief={data.brief} setBrief={(val) => setData('brief', val)} />
                            )}

                            {/* Add to Cart Actions */}
                            <div className="mt-2 flex flex-col gap-4">
                                <Button
                                    size="lg"
                                    className="h-14 w-fit text-lg"
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
                                        <Link
                                            href={login()}
                                            className="text-foreground underline underline-offset-4"
                                        >
                                            log in
                                        </Link>{' '}
                                        to purchase this product.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="order-2 flex flex-col md:order-1">
                            {/* Desktop Title & Price (Hidden on Mobile) */}
                            <div className="hidden md:block">
                                <h1 className="mb-2 text-3xl font-bold tracking-tight">
                                    {product.title}
                                </h1>

                                {auth.user && showPrice && !showVariantSelector && (
                                    <div className="mb-6 text-2xl font-semibold text-primary">
                                        Rs. {selectedVariant?.price_npr}
                                    </div>
                                )}

                                {product.type === 'physical' && product.physical_detail && (
                                    <div className="mb-6 rounded-md bg-slate-50 p-4 border text-sm text-slate-700">
                                        <p><strong>Physical Item</strong></p>
                                        {product.physical_detail.weight_grams !== null && (
                                            <p>Weight: {product.physical_detail.weight_grams} g</p>
                                        )}
                                        {product.physical_detail.free_shipping && <p>Free shipping.</p>}
                                    </div>
                                )}

                                {product.type === 'service' && product.service_detail && (
                                    <div className="mb-6 rounded-md bg-blue-50/50 p-4 border border-blue-100 text-sm text-slate-700">
                                        <p><strong>Service Item</strong></p>
                                        {product.service_detail.delivery_days && <p>Delivery within {product.service_detail.delivery_days} days</p>}
                                        {product.service_detail.revisions !== null && <p>Revisions included: {product.service_detail.revisions}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Product Gallery (Below Price) */}
                            {galleryImages.length > 0 && (
                                <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
                                    {galleryImages.map((imgSrc, idx) => (
                                        <LightboxImageAnchor
                                            key={idx}
                                            src={imgSrc}
                                            alt={`${product.title} gallery ${idx + 1}`}
                                            ariaLabel={`View gallery image ${idx + 1} for ${product.title}`}
                                            className="aspect-square overflow-hidden rounded-md border-2 border-transparent hover:border-primary/50 transition-colors"
                                            imageClassName="h-full w-full object-cover"
                                            onClick={(event) => {
                                                if (!shouldOpenLightboxFromClick(event)) {
                                                    return;
                                                }

                                                event.preventDefault();
                                                setMainImageIndex(product.image ? idx + 1 : idx);
                                                setLightboxOpen(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            <ProductDescription
                                description={product.description}
                            />
                        </div>
                    </div>
                </main>
        </>
    );
}

Show.layout = (page: React.ReactNode) => <StorefrontLayout>{page}</StorefrontLayout>;
