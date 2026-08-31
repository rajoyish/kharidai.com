import { Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { Fragment } from 'react';

import { CategoryPill } from '@/components/category-pill';
import { MaskedLinesHeading } from '@/components/masked-lines-heading';
import { SeoHead } from '@/components/seo-head';
import { StorefrontProductCard } from '@/components/storefront-product-card';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { home } from '@/routes';
import { show as showCategory } from '@/routes/categories';
import type {
    StorefrontCategory,
    StorefrontCategorySummary,
    StorefrontProduct,
} from '@/types';

type PaginationData<T> = {
    data: T[];
    next_page_url: string | null;
    prev_page_url: string | null;
    total: number;
    from: number;
    to: number;
};

export default function Show({
    category,
    categories,
    products,
}: {
    category: StorefrontCategory;
    categories: StorefrontCategorySummary[];
    products: PaginationData<StorefrontProduct>;
}) {
    const productCount = products.total;

    return (
        <>
            <SeoHead />

            <main className="container mx-auto px-4 py-10">
                <Link
                    href={home()}
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to all categories
                </Link>

                <section className="mb-10 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-sm font-semibold text-primary/80 uppercase">
                                Category
                            </p>
                            <MaskedLinesHeading
                                key={category.slug}
                                animateOnScroll
                                className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
                            >
                                {category.name}
                            </MaskedLinesHeading>
                            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                                {productCount > 0
                                    ? `Explore all ${productCount} products currently available in ${category.name}.`
                                    : `There are no in-stock products in ${category.name} right now.`}
                            </p>
                        </div>

                        <div className="grid gap-3 rounded-2xl border border-border bg-muted p-5 text-center text-sm text-muted-foreground">
                            <span className="font-medium text-muted-foreground">
                                Available now
                            </span>
                            <span className="text-3xl font-semibold tracking-tight text-foreground">
                                {productCount}
                            </span>
                            <span>
                                {productCount === 1
                                    ? 'product ready to browse'
                                    : 'products ready to browse'}
                            </span>
                        </div>
                    </div>
                </section>

                {categories.length > 0 && (
                    <section className="mb-10">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase">
                                Browse Categories
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {categories.map((storefrontCategory) => {
                                const isCurrentCategory =
                                    storefrontCategory.slug === category.slug;

                                const isParentOfCurrentCategory =
                                    storefrontCategory.children?.some(
                                        (c) => c.slug === category.slug,
                                    );

                                const isExpanded =
                                    isCurrentCategory ||
                                    isParentOfCurrentCategory;

                                return (
                                    <Fragment key={storefrontCategory.id}>
                                        <CategoryPill
                                            href={showCategory(
                                                storefrontCategory,
                                            )}
                                            prefetch
                                            name={storefrontCategory.name}
                                            count={
                                                storefrontCategory.product_count
                                            }
                                            state={
                                                isCurrentCategory
                                                    ? 'active'
                                                    : isExpanded
                                                      ? 'expanded'
                                                      : 'default'
                                            }
                                        />

                                        {isExpanded &&
                                            storefrontCategory.children?.map(
                                                (child) => (
                                                    <CategoryPill
                                                        key={child.id}
                                                        href={showCategory(
                                                            child,
                                                        )}
                                                        prefetch
                                                        size="sm"
                                                        name={child.name}
                                                        count={
                                                            child.product_count
                                                        }
                                                        state={
                                                            child.slug ===
                                                            category.slug
                                                                ? 'active'
                                                                : 'default'
                                                        }
                                                    />
                                                ),
                                            )}
                                    </Fragment>
                                );
                            })}
                        </div>
                    </section>
                )}

                {productCount > 0 ? (
                    <>
                        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {products.data.map((product) => (
                                <StorefrontProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </section>

                        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-medium text-foreground">
                                        {products.from}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium text-foreground">
                                        {products.to}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-foreground">
                                        {products.total}
                                    </span>{' '}
                                    results
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {products.prev_page_url ? (
                                    <Link
                                        href={products.prev_page_url}
                                        preserveScroll
                                        className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted hover:text-primary-text"
                                    >
                                        Previous
                                    </Link>
                                ) : (
                                    <span className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground/60">
                                        Previous
                                    </span>
                                )}

                                {products.next_page_url ? (
                                    <Link
                                        href={products.next_page_url}
                                        preserveScroll
                                        className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted hover:text-primary-text"
                                    >
                                        Next
                                    </Link>
                                ) : (
                                    <span className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground/60">
                                        Next
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <section className="rounded-3xl border border-dashed border-border-strong bg-card px-8 py-16 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold text-foreground">
                            No products available right now
                        </h2>
                        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                            This category exists, but it does not have any
                            in-stock products at the moment.
                        </p>
                        <Link
                            href={home()}
                            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                            Explore all categories
                        </Link>
                    </section>
                )}
            </main>
        </>
    );
}

Show.layout = (page: React.ReactNode) => (
    <StorefrontLayout className="min-h-screen storefront-canvas text-foreground">
        {page}
    </StorefrontLayout>
);
