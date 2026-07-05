import { router, usePage } from '@inertiajs/react';
import { Briefcase, CloudDownload, Search, Star, Truck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { HeroFanCards } from '@/components/hero-fan-cards';
import { MaskedLinesHeading } from '@/components/masked-lines-heading';
import { PinnedPanels } from '@/components/pinned-panels';
import { SeoHead } from '@/components/seo-head';
import { StorefrontHomeSection } from '@/components/storefront-home-section';
import { Input } from '@/components/ui/input';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { home } from '@/routes';
import { index as digitalProducts } from '@/routes/digital-products';
import { index as physicalProducts } from '@/routes/physical-products';
import { index as services } from '@/routes/services';
import type {
    StorefrontProduct,
    StorefrontSection,
    StorefrontType,
} from '@/types';

const SECTION_HREF: Record<
    StorefrontType,
    ReturnType<typeof digitalProducts>
> = {
    digital: digitalProducts(),
    physical: physicalProducts(),
    service: services(),
};

function countProduct(product: StorefrontProduct): number {
    return 1 + (product.variants?.length ?? 0);
}

export default function Welcome({
    sections,
}: {
    sections: StorefrontSection[];
}) {
    const { url } = usePage();
    const searchParams = new URLSearchParams(url.split('?')[1] || '');
    const initialSearch = searchParams.get('search') || '';

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const handler = setTimeout(() => {
            router.get(
                home.url(),
                { search: searchQuery || undefined },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['sections'],
                },
            );
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const totalItemsCount = useMemo(
        () =>
            sections.reduce((total, section) => {
                const categorized = section.categories.reduce(
                    (sum, category) => {
                        const own = category.products.reduce(
                            (acc, product) => acc + countProduct(product),
                            0,
                        );
                        const children = (category.children ?? []).reduce(
                            (acc, child) =>
                                acc +
                                (child.products ?? []).reduce(
                                    (childAcc, product) =>
                                        childAcc + countProduct(product),
                                    0,
                                ),
                            0,
                        );

                        return sum + own + children;
                    },
                    0,
                );

                const uncategorized = section.uncategorizedProducts.reduce(
                    (sum, product) => sum + countProduct(product),
                    0,
                );

                return total + categorized + uncategorized;
            }, 0),
        [sections],
    );

    const hasResults = sections.some(
        (section) =>
            section.categories.some(
                (category) =>
                    category.products.length > 0 ||
                    (category.children ?? []).some(
                        (child) => (child.products?.length ?? 0) > 0,
                    ),
            ) || section.uncategorizedProducts.length > 0,
    );

    const scrollToShop = () => {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <SeoHead />
            <PinnedPanels>
                <div
                    data-panel
                    className="relative overflow-hidden bg-linear-to-br from-primary/10 via-white to-accent/10 pb-32"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_0.0625rem,transparent_0.0625rem),linear-gradient(to_bottom,#80808012_0.0625rem,transparent_0.0625rem)] [mask-image:linear-gradient(to_bottom,white,transparent)] bg-[size:1.5rem_1.5rem]" />

                    <div data-panel-inner>
                        <div className="relative z-10 container mx-auto mt-20 max-w-4xl px-4 text-center">
                            <MaskedLinesHeading className="mb-6 text-5xl leading-[1.1] font-bold tracking-tight text-[#1A1A1A] md:text-7xl">
                                Your all-in-one
                                <br />
                                marketplace!
                            </MaskedLinesHeading>
                            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
                                Discover digital goods, premium subscriptions,
                                trusted services, and physical products all at
                                unbeatable prices. Shop smart. Shop reliable.
                            </p>

                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <button
                                    onClick={scrollToShop}
                                    className="rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-xl"
                                >
                                    Start Here
                                </button>
                            </div>
                        </div>

                        <HeroFanCards totalItemsCount={totalItemsCount} />
                    </div>
                </div>

                <div
                    data-panel
                    className="relative overflow-hidden bg-[#09090b] py-32"
                >
                    <div className="pointer-events-none absolute top-0 left-1/4 size-160 -translate-y-1/2 transform rounded-full bg-primary/20 mix-blend-screen blur-[8rem]" />
                    <div className="pointer-events-none absolute right-1/4 bottom-0 size-160 translate-y-1/3 transform rounded-full bg-accent/20 mix-blend-screen blur-[8rem]" />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 size-120 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-primary/10 mix-blend-screen blur-[8rem]" />

                    <div className="absolute top-0 right-0 left-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
                    <div
                        data-panel-inner
                        className="relative z-10 container mx-auto max-w-5xl px-4"
                    >
                        <div className="mb-20 text-center">
                            <h2 className="mb-4 text-4xl text-white">
                                A path to better shopping
                            </h2>
                            <p className="text-lg text-gray-400">
                                Kharidai helps you discover the best products
                                without the hassle.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/3 p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/6">
                                <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-accent/20 blur-2xl transition-colors group-hover:bg-accent/30" />
                                <CloudDownload className="relative z-10 mb-4 h-8 w-8 text-accent" />
                                <h3 className="relative z-10 mb-3 text-2xl text-white">
                                    Digital Goods
                                </h3>
                                <p className="relative z-10 leading-relaxed text-gray-400">
                                    Instant access to software, game keys, and
                                    digital content. Delivered directly to your
                                    email within seconds.
                                </p>
                            </div>
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/3 p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/6">
                                <div className="pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full bg-primary/20 blur-2xl transition-colors group-hover:bg-primary/30" />
                                <Star className="relative z-10 mb-4 h-8 w-8 text-primary" />
                                <h3 className="relative z-10 mb-3 text-2xl text-white">
                                    Premium Subscriptions
                                </h3>
                                <p className="relative z-10 leading-relaxed text-gray-400">
                                    Unlock premium features on your favorite
                                    platforms at unbeatable discounted rates.
                                </p>
                            </div>
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/3 p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/6">
                                <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-accent/20 blur-2xl transition-colors group-hover:bg-accent/30" />
                                <Briefcase className="relative z-10 mb-4 h-8 w-8 text-accent" />
                                <h3 className="relative z-10 mb-3 text-2xl text-white">
                                    Trusted Services
                                </h3>
                                <p className="relative z-10 leading-relaxed text-gray-400">
                                    Hire top-rated professionals for freelance
                                    work, consulting, and specialized services.
                                </p>
                            </div>
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/3 p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/6">
                                <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/20 blur-2xl transition-colors group-hover:bg-primary/30" />
                                <Truck className="relative z-10 mb-4 h-8 w-8 text-primary" />
                                <h3 className="relative z-10 mb-3 text-2xl text-white">
                                    Physical Products
                                </h3>
                                <p className="relative z-10 leading-relaxed text-gray-400">
                                    Shop for electronics, gadgets, and everyday
                                    essentials with fast, reliable shipping to
                                    your door.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </PinnedPanels>

            <div className="relative z-20 bg-white">
                <main
                    id="shop"
                    className="container mx-auto max-w-7xl flex-1 px-4 py-24"
                >
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl text-[#1A1A1A]">
                            Explore the marketplace
                        </h2>
                        <p className="text-gray-500">
                            Digital products, physical products, and services —
                            each in its own space.
                        </p>
                    </div>

                    <div className="mb-16 flex flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_0.5rem_1.875rem_rgba(0,0,0,0.04)] sm:flex-row">
                        <Input
                            type="search"
                            placeholder="Search categories or products..."
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50 text-base focus-visible:ring-accent sm:flex-1"
                        />
                    </div>

                    {hasResults ? (
                        <div className="space-y-20">
                            {sections.map((section) => (
                                <StorefrontHomeSection
                                    key={section.type}
                                    section={section}
                                    href={SECTION_HREF[section.type]}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-12 text-center">
                            <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                            <h3 className="mb-2 text-xl text-gray-900">
                                No products found
                            </h3>
                            <p className="text-gray-500">
                                We couldn&apos;t find any categories or products
                                matching your search.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

Welcome.layout = (page: React.ReactNode) => (
    <StorefrontLayout className="flex min-h-screen flex-col bg-[#FAFAFA] text-foreground">
        {page}
    </StorefrontLayout>
);
