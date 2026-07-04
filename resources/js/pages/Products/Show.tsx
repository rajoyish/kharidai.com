import { Link, useForm, usePage } from '@inertiajs/react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { add as addToCart } from '@/actions/App/Http/Controllers/CartController';
import { JsonLd } from '@/components/json-ld';
import { LightboxImageAnchor, shouldOpenLightboxFromClick } from '@/components/lightbox-image-link';
import { ProductDescription } from '@/components/product-description';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { login } from '@/routes';
import type { PageProps } from '@/types';

const ImageLightbox = lazy(() => import('@/components/image-lightbox'));

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
    variants: Variant[];
    galleries?: ProductGallery[];
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

    const { setData, post, processing } = useForm({
        product_variant_id: selectedVariant?.id,
        quantity: 1,
    });

    const handleAddToCart = () => {
        if (!selectedVariant) {
            return;
        }

        post(addToCart.url(), {
            only: ['cartCount'],
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

                                {auth.user && selectedVariant && (
                                    <div className="text-2xl font-semibold text-primary">
                                        Rs. {selectedVariant.price_npr}
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
                            {auth.user && product.variants.length > 0 && (
                                <div>
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

                            {/* Add to Cart Actions */}
                            <div className="mt-2 flex flex-col gap-4">
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

                                {auth.user && selectedVariant && (
                                    <div className="mb-6 text-2xl font-semibold text-primary">
                                        Rs. {selectedVariant.price_npr}
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
