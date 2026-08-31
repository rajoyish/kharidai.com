import { Cpu, Package, Wrench } from 'lucide-react';
import type { ComponentType } from 'react';

import { SeoHead } from '@/components/seo-head';
import { StorefrontCatalog } from '@/components/storefront-catalog';
import { StorefrontSearch } from '@/components/storefront-search';
import { collectAllProducts } from '@/lib/storefront-products';
import { index as digitalProducts } from '@/routes/digital-products';
import { index as physicalProducts } from '@/routes/physical-products';
import { index as services } from '@/routes/services';
import type {
    StorefrontCategory,
    StorefrontProduct,
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

const TYPE_HREF: Record<StorefrontType, string> = {
    digital: digitalProducts().url,
    physical: physicalProducts().url,
    service: services().url,
};

const SEARCH_ONLY = ['categories', 'uncategorizedProducts', 'filters'];

/**
 * Shared body for the dedicated, single-type storefront pages
 * (`/digital-products`, `/physical-products`, `/services`). Each page passes its
 * own type-scoped data; nothing from another product type ever reaches here.
 */
export function StorefrontTypePage({
    type,
    label,
    tagline,
    categories,
    uncategorizedProducts,
    filters,
}: {
    type: StorefrontType;
    label: string;
    tagline: string;
    categories: StorefrontCategory[];
    uncategorizedProducts: StorefrontProduct[];
    filters: { search: string | null };
}) {
    const Icon = TYPE_ICON[type];
    const itemCount = collectAllProducts(
        categories,
        uncategorizedProducts,
    ).length;

    const activeSearch = filters.search ?? '';

    return (
        <>
            <SeoHead />

            <main className="container mx-auto max-w-7xl px-4 py-12 md:py-16">
                <section className="mb-12 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm md:p-12">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Icon className="h-7 w-7" />
                            </span>
                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                                {label}
                            </h1>
                            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                                {tagline}
                            </p>
                        </div>

                        <div className="grid gap-2 rounded-3xl border border-border bg-muted px-8 py-6 text-center">
                            <span className="text-sm font-medium text-muted-foreground">
                                Available now
                            </span>
                            <span className="text-4xl font-semibold tracking-tight text-foreground">
                                {itemCount}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {itemCount === 1 ? 'item' : 'items'} ready to
                                browse
                            </span>
                        </div>
                    </div>
                </section>

                <StorefrontSearch
                    href={TYPE_HREF[type]}
                    only={SEARCH_ONLY}
                    currentSearch={activeSearch}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="mb-12 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:flex-row"
                />

                <StorefrontCatalog
                    categories={categories}
                    uncategorizedProducts={uncategorizedProducts}
                    emptyTitle={
                        activeSearch
                            ? `No ${label.toLowerCase()} match your search`
                            : `No ${label.toLowerCase()} yet`
                    }
                    emptyDescription={
                        activeSearch
                            ? `We couldn't find any ${label.toLowerCase()} matching "${activeSearch}". Try a different term.`
                            : `We're still curating our ${label.toLowerCase()}. Check back soon — new listings arrive regularly.`
                    }
                />
            </main>
        </>
    );
}
