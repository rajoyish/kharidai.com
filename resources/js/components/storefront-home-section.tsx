import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight, Cpu, Package, Wrench } from 'lucide-react';
import type { ComponentType } from 'react';

import {
    collectAllProducts,
    collectCategoryProducts,
} from '@/lib/storefront-products';
import { show as showCategory } from '@/routes/categories';
import type {
    StorefrontCategory,
    StorefrontSection,
    StorefrontType,
} from '@/types';

const TYPE_ICON: Record<
    StorefrontType,
    ComponentType<{ className?: string }>
> = {
    digital: Cpu,
    physical: Package,
    service: Wrench,
};

function categoryItemCount(category: StorefrontCategory): number {
    return collectCategoryProducts(category).length;
}

function sectionItemCount(section: StorefrontSection): number {
    return collectAllProducts(section.categories, section.uncategorizedProducts)
        .length;
}

/**
 * One product-type block on the homepage: a labelled header linking to the
 * dedicated page, a card per type-scoped category, and any type-scoped products
 * without a category. Renders nothing when the type has no available items.
 */
export function StorefrontHomeSection({
    section,
    href,
}: {
    section: StorefrontSection;
    href: InertiaLinkProps['href'];
}) {
    const itemCount = sectionItemCount(section);

    if (itemCount === 0) {
        return null;
    }

    const populatedCategories = section.categories.filter(
        (category) => categoryItemCount(category) > 0,
    );
    const Icon = TYPE_ICON[section.type];

    return (
        <section
            id={`${section.type}-products`}
            aria-labelledby={`${section.type}-heading`}
            className="scroll-mt-24"
        >
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                    </span>
                    <div>
                        <h2
                            id={`${section.type}-heading`}
                            className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl"
                        >
                            {section.label}
                        </h2>
                        <p className="mt-1 max-w-md text-sm text-slate-500">
                            {section.tagline}
                        </p>
                    </div>
                </div>
                <Link
                    href={href}
                    prefetch
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary"
                >
                    View all
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            {populatedCategories.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {populatedCategories.map((category) => {
                        const count = categoryItemCount(category);

                        return (
                            <Link
                                key={category.id}
                                href={showCategory(category)}
                                prefetch
                                className="group flex flex-col rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_1.125rem_2.8125rem_-1.75rem_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_1.5625rem_3.75rem_-1.875rem_rgba(17,118,188,0.35)]"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                                        {category.name}
                                    </h3>
                                    <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                        {count} {count === 1 ? 'item' : 'items'}
                                    </span>
                                </div>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {category.products
                                        .slice(0, 4)
                                        .map((product) => (
                                            <span
                                                key={product.id}
                                                title={product.title}
                                                className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600"
                                            >
                                                {product.title}
                                            </span>
                                        ))}
                                    {count > 4 && (
                                        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                                            +{count - 4} more
                                        </span>
                                    )}
                                </div>
                                <div className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-primary">
                                    Browse category
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
