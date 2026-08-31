import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

import { TruncatedText } from '@/components/truncated-text';
import { Badge } from '@/components/ui/badge';
import { formatNpr } from '@/lib/currency';
import { LINK_PREFETCH } from '@/lib/prefetch';
import { show as showProduct } from '@/routes/products';
import type { StorefrontProduct } from '@/types';

function formatStartingPrice(product: StorefrontProduct): string | null {
    const cents = product.starting_price_cents;

    // No priced variant (null) or a price-on-request placeholder (0) shows no
    // "Starting at" line, matching the product detail page.
    if (cents == null || cents <= 0) {
        return null;
    }

    return formatNpr(cents / 100);
}

export function StorefrontProductCard({
    product,
}: {
    product: StorefrontProduct;
}) {
    const startingPrice = formatStartingPrice(product);

    return (
        <Link
            href={showProduct(product)}
            prefetch={LINK_PREFETCH}
            className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
        >
            <div className="mb-5 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                {product.image ? (
                    <img
                        src={`/storage/${product.image}`}
                        alt={product.image_alt ?? product.title}
                        width={640}
                        height={480}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,var(--primary-surface),transparent_60%)] text-sm font-medium text-muted-foreground">
                        No image
                    </div>
                )}
            </div>

            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                        <TruncatedText asChild title={product.title}>
                            <h3 className="min-w-0 text-lg leading-tight font-semibold text-card-foreground">
                                {product.title}
                            </h3>
                        </TruncatedText>
                        {product.type === 'physical' && (
                            <Badge
                                variant="secondary"
                                className="h-5 py-0 text-xs"
                            >
                                Physical
                            </Badge>
                        )}
                        {product.type === 'service' && (
                            <Badge variant="info" className="h-5 py-0 text-xs">
                                Service
                            </Badge>
                        )}
                    </div>
                    {startingPrice && (
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                            Starting at{' '}
                            <span className="text-base font-semibold text-primary-text">
                                {startingPrice}
                            </span>
                        </p>
                    )}
                </div>
                <span className="mt-0.5 rounded-full bg-accent p-2 text-accent-foreground transition-colors duration-200 group-hover:bg-accent-hover">
                    <ArrowUpRight className="h-4 w-4" />
                </span>
            </div>
        </Link>
    );
}
