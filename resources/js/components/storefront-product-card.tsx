import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

import { TruncatedText } from '@/components/truncated-text';
import { Badge } from '@/components/ui/badge';
import { show as showProduct } from '@/routes/products';
import type { StorefrontProduct } from '@/types';

function formatStartingPrice(product: StorefrontProduct): string | null {
    const cents = product.starting_price_cents;

    // No priced variant (null) or a price-on-request placeholder (0) shows no
    // "Starting at" line, matching the product detail page.
    if (cents == null || cents <= 0) {
        return null;
    }

    return (cents / 100).toLocaleString();
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
            prefetch
            className="group block rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_25px_60px_-30px_rgba(17,118,188,0.35)]"
        >
            <div className="mb-5 aspect-[4/3] overflow-hidden rounded-[0.5rem] bg-slate-100">
                {product.image ? (
                    <img
                        src={`/storage/${product.image}`}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe,transparent_55%),linear-gradient(135deg,#e2e8f0,#f8fafc)] text-sm font-medium text-slate-500">
                        No image
                    </div>
                )}
            </div>

            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                        <TruncatedText asChild title={product.title}>
                            <h3 className="min-w-0 text-lg leading-tight font-semibold text-slate-950">
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
                            <Badge
                                variant="secondary"
                                className="h-5 bg-blue-100 py-0 text-xs text-blue-700 hover:bg-blue-200"
                            >
                                Service
                            </Badge>
                        )}
                    </div>
                    {startingPrice && (
                        <p className="mt-1 text-sm font-medium text-slate-600">
                            Starting at{' '}
                            <span className="text-base font-semibold text-primary">
                                Rs. {startingPrice}
                            </span>
                        </p>
                    )}
                </div>
                <span className="mt-0.5 rounded-full bg-accent p-2 text-white transition-colors group-hover:bg-primary">
                    <ArrowUpRight className="h-4 w-4" />
                </span>
            </div>
        </Link>
    );
}
