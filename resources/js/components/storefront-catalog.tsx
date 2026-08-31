import { Link } from '@inertiajs/react';
import { ArrowRight, PackageOpen } from 'lucide-react';

import { StorefrontProductCard } from '@/components/storefront-product-card';
import { collectCategoryProducts } from '@/lib/storefront-products';
import { home } from '@/routes';
import { show as showCategory } from '@/routes/categories';
import type { StorefrontCategory, StorefrontProduct } from '@/types';

/**
 * Full, type-scoped product catalogue for a dedicated storefront page. Renders a
 * section per category (with its subcategory products folded in) plus any
 * uncategorised products, and a friendly empty state when nothing is available.
 */
export function StorefrontCatalog({
    categories,
    uncategorizedProducts,
    emptyTitle,
    emptyDescription,
}: {
    categories: StorefrontCategory[];
    uncategorizedProducts: StorefrontProduct[];
    emptyTitle: string;
    emptyDescription: string;
}) {
    const populatedCategories = categories.filter(
        (category) => collectCategoryProducts(category).length > 0,
    );
    const hasUncategorized = uncategorizedProducts.length > 0;

    if (populatedCategories.length === 0 && !hasUncategorized) {
        return (
            <section className="rounded-3xl border border-dashed border-border-strong bg-card px-8 py-16 text-center shadow-sm">
                <PackageOpen className="mx-auto mb-4 h-14 w-14 text-muted-foreground/60" />
                <h2 className="text-2xl font-semibold text-foreground">
                    {emptyTitle}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                    {emptyDescription}
                </p>
                <Link
                    href={home()}
                    className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                    Back to home
                </Link>
            </section>
        );
    }

    return (
        <div className="space-y-16">
            {populatedCategories.map((category) => {
                const products = collectCategoryProducts(category);

                return (
                    <section
                        key={category.id}
                        aria-labelledby={`category-${category.id}`}
                    >
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2
                                    id={`category-${category.id}`}
                                    className="text-2xl font-semibold tracking-tight text-foreground"
                                >
                                    {category.name}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {products.length}{' '}
                                    {products.length === 1 ? 'item' : 'items'}{' '}
                                    available
                                </p>
                            </div>
                            <Link
                                href={showCategory(category)}
                                prefetch
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary-text transition-colors hover:border-primary/30 hover:bg-primary/5"
                            >
                                View category
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {products.map((product) => (
                                <StorefrontProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}

            {hasUncategorized && (
                <section aria-labelledby="catalog-more">
                    <div className="mb-6">
                        <h2
                            id="catalog-more"
                            className="text-2xl font-semibold tracking-tight text-foreground"
                        >
                            More
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Available items that are not grouped into a category
                            yet.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {uncategorizedProducts.map((product) => (
                            <StorefrontProductCard
                                key={product.id}
                                product={product}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
