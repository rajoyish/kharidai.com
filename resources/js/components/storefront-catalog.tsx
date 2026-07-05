import { Link } from '@inertiajs/react';
import { ArrowRight, PackageOpen } from 'lucide-react';

import { StorefrontProductCard } from '@/components/storefront-product-card';
import { home } from '@/routes';
import { show as showCategory } from '@/routes/categories';
import type { StorefrontCategory, StorefrontProduct } from '@/types';

/**
 * All in-stock products that belong to a category, including any that live in
 * its subcategories, flattened into a single list for display.
 */
function collectProducts(category: StorefrontCategory): StorefrontProduct[] {
    const childProducts = (category.children ?? []).flatMap(
        (child) => child.products ?? [],
    );

    return [...category.products, ...childProducts];
}

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
        (category) => collectProducts(category).length > 0,
    );
    const hasUncategorized = uncategorizedProducts.length > 0;

    if (populatedCategories.length === 0 && !hasUncategorized) {
        return (
            <section className="rounded-4xl border border-dashed border-slate-300 bg-white/75 px-8 py-16 text-center shadow-[0_1.25rem_3.125rem_-2.5rem_rgba(15,23,42,0.45)]">
                <PackageOpen className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                <h2 className="text-2xl font-semibold text-slate-950">
                    {emptyTitle}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-slate-600">
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
                const products = collectProducts(category);

                return (
                    <section
                        key={category.id}
                        aria-labelledby={`category-${category.id}`}
                    >
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2
                                    id={`category-${category.id}`}
                                    className="text-2xl font-semibold tracking-tight text-slate-950"
                                >
                                    {category.name}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {products.length}{' '}
                                    {products.length === 1 ? 'item' : 'items'}{' '}
                                    available
                                </p>
                            </div>
                            <Link
                                href={showCategory(category)}
                                prefetch
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
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
                            className="text-2xl font-semibold tracking-tight text-slate-950"
                        >
                            More
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
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
