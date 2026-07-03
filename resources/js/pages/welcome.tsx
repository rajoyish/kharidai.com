import { Link } from '@inertiajs/react';
import {
    Archive,
    ArrowRight,
    Briefcase,
    CloudDownload,
    Search,
    ShoppingBag,
    Sparkles,
    Star,
    Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { FloatingContactActions } from '@/components/floating-contact-actions';
import { Footer } from '@/components/Footer';
import { SeoHead } from '@/components/seo-head';
import { StorefrontHeader } from '@/components/storefront-header';
import { StorefrontProductCard } from '@/components/storefront-product-card';
import { Input } from '@/components/ui/input';
import { show as showCategory } from '@/routes/categories';
import type {
    StorefrontCategory,
    StorefrontNavigationData,
    StorefrontProduct,
} from '@/types';

function productMatchesQuery(
    product: StorefrontProduct,
    normalizedQuery: string,
): boolean {
    return (
        product.title.toLowerCase().includes(normalizedQuery) ||
        (product.description ?? '').toLowerCase().includes(normalizedQuery)
    );
}

export default function Welcome({
    uncategorizedProducts,
    categories,
    storefront,
}: {
    uncategorizedProducts: StorefrontProduct[];
    categories: StorefrontCategory[];
    storefront: StorefrontNavigationData;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const hasActiveSearch = normalizedQuery.length > 0;

    const filteredCategories = useMemo(() => {
        if (!normalizedQuery) {
            return categories;
        }

        return categories
            .map((category) => {
                const categoryMatches = category.name
                    .toLowerCase()
                    .includes(normalizedQuery);

                if (categoryMatches) {
                    return category;
                }

                return {
                    ...category,
                    products: category.products.filter((product) =>
                        productMatchesQuery(product, normalizedQuery),
                    ),
                };
            })
            .filter((category) => category.products.length > 0);
    }, [categories, normalizedQuery]);

    const filteredUncategorizedProducts = useMemo(() => {
        if (!normalizedQuery) {
            return uncategorizedProducts;
        }

        return uncategorizedProducts.filter((product) =>
            productMatchesQuery(product, normalizedQuery),
        );
    }, [normalizedQuery, uncategorizedProducts]);

    const totalItemsCount = useMemo(() => {
        let count = 0;

        categories.forEach((category) => {
            category.products.forEach((product) => {
                count += 1;

                if (product.variants) {
                    count += product.variants.length;
                }
            });
        });

        uncategorizedProducts.forEach((product) => {
            count += 1;

            if (product.variants) {
                count += product.variants.length;
            }
        });

        return count;
    }, [categories, uncategorizedProducts]);

    const scrollToShop = () => {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <SeoHead />
            <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-foreground">
                <StorefrontHeader categories={storefront.categories} />
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-accent/10 pb-32">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_0.0625rem,transparent_0.0625rem),linear-gradient(to_bottom,#80808012_0.0625rem,transparent_0.0625rem)] bg-[size:1.5rem_1.5rem] [mask-image:linear-gradient(to_bottom,white,transparent)]" />

                    <div className="relative z-10 container mx-auto mt-20 max-w-4xl px-4 text-center">
                        <h1 className="mb-6 text-5xl leading-[1.1] font-bold tracking-tight text-[#1A1A1A] md:text-7xl">
                            Your all-in-one
                            <br />
                            marketplace!
                        </h1>
                        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
                            Discover digital goods, premium subscriptions,
                            trusted services, and physical products all at
                            unbeatable prices. Shop smart. Shop reliable.
                        </p>

                        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <button
                                onClick={scrollToShop}
                                className="rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
                            >
                                Start Here
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 mt-20 mx-auto flex h-64 max-w-5xl justify-center px-4 perspective-1000 md:h-80">
                        <div className="absolute z-30 w-72 -translate-y-4 transform cursor-pointer rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_1.25rem_3.125rem_-0.75rem_rgba(0,0,0,0.1)] transition-[transform,box-shadow,z-index] duration-500 ease-out hover:z-50 hover:-translate-y-8 hover:scale-105 hover:shadow-[0_1.875rem_3.75rem_-0.9375rem_rgba(0,0,0,0.15)] focus:z-50 focus:-translate-y-8 focus:scale-105 focus:shadow-[0_1.875rem_3.75rem_-0.9375rem_rgba(0,0,0,0.15)] focus:outline-none">
                            <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                            <h3 className="mb-3 text-center text-xl text-gray-900">
                                Find exactly what you need, instantly.
                            </h3>
                            <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-gray-400">
                                <span>{totalItemsCount} items</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                <span>24/7 delivery</span>
                            </div>
                        </div>
                        <div className="absolute z-20 w-64 -translate-x-32 translate-y-12 rotate-[-8deg] transform cursor-pointer rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_0.9375rem_2.5rem_-0.75rem_rgba(0,0,0,0.08)] transition-[transform,box-shadow,z-index] duration-500 ease-out hover:z-50 hover:translate-y-0 hover:rotate-0 hover:scale-110 hover:shadow-[0_1.875rem_3.75rem_-0.9375rem_rgba(0,0,0,0.15)] focus:z-50 focus:translate-y-0 focus:rotate-0 focus:scale-110 focus:shadow-[0_1.875rem_3.75rem_-0.9375rem_rgba(0,0,0,0.15)] focus:outline-none md:-translate-x-56">
                            <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent shadow-inner">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <h3 className="text-center text-lg text-gray-800">
                                Premium Subscriptions
                            </h3>
                        </div>
                        <div className="absolute z-20 w-64 translate-x-32 translate-y-12 rotate-[8deg] transform cursor-pointer rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_0.9375rem_2.5rem_-0.75rem_rgba(0,0,0,0.08)] transition-[transform,box-shadow,z-index] duration-500 ease-out hover:z-50 hover:translate-y-0 hover:rotate-0 hover:scale-110 hover:shadow-[0_1.875rem_3.75rem_-0.9375rem_rgba(0,0,0,0.15)] focus:z-50 focus:translate-y-0 focus:rotate-0 focus:scale-110 focus:shadow-[0_1.875rem_3.75rem_-0.9375rem_rgba(0,0,0,0.15)] focus:outline-none md:translate-x-56">
                            <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary shadow-inner">
                                <Archive className="h-4 w-4" />
                            </div>
                            <h3 className="text-center text-lg text-gray-800">
                                Trusted Physical Goods
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-[#09090b] py-32">
                    <div className="pointer-events-none absolute top-0 left-1/4 h-[40rem] w-[40rem] -translate-y-1/2 transform rounded-full bg-primary/20 blur-[8rem] mix-blend-screen" />
                    <div className="pointer-events-none absolute right-1/4 bottom-0 h-[40rem] w-[40rem] translate-y-1/3 transform rounded-full bg-accent/20 blur-[8rem] mix-blend-screen" />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-primary/10 blur-[8rem] mix-blend-screen" />

                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="container relative z-10 mx-auto max-w-5xl px-4">
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
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/[0.03] p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
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
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/[0.03] p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
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
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/[0.03] p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
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
                            <div className="group relative overflow-hidden rounded-4xl border border-white/10 bg-white/[0.03] p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
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

                <main id="shop" className="container mx-auto max-w-7xl flex-1 px-4 py-24">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl text-[#1A1A1A]">
                            Explore by category
                        </h2>
                        <p className="text-gray-500">
                            Browse each category on its own page and dive into
                            the products that belong there.
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

                    {filteredCategories.length > 0 && (
                        <section className="grid grid-cols-1 gap-6">
                            {filteredCategories.map((category) => (
                                <Link
                                    key={category.id}
                                    href={showCategory(category)}
                                    prefetch
                                    className="group block overflow-hidden rounded-4xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_1.375rem_3.75rem_-2.625rem_rgba(15,23,42,0.42)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_1.75rem_4.375rem_-2.25rem_rgba(17,118,188,0.3)] md:p-8"
                                >
                                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                                        <div>
                                            <p className="text-sm font-semibold uppercase text-primary/80">
                                                Category
                                            </p>
                                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <h3 className="text-3xl font-semibold tracking-tight text-slate-950">
                                                    {category.name}
                                                </h3>
                                                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                                                    {category.products.length}{' '}
                                                    {hasActiveSearch
                                                        ? category.products
                                                            .length === 1
                                                            ? 'match'
                                                            : 'matches'
                                                        : category.products
                                                            .length === 1
                                                            ? 'product'
                                                            : 'products'}
                                                </span>
                                            </div>
                                            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                                                Open the {category.name} page to
                                                browse every product in this
                                                category.
                                            </p>
                                            <div className="mt-6 flex flex-wrap gap-2">
                                                {category.products
                                                    .slice(0, 4)
                                                    .map((product) => (
                                                        <span
                                                            key={product.id}
                                                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600"
                                                        >
                                                            {product.title}
                                                        </span>
                                                    ))}
                                                {category.products.length >
                                                    4 && (
                                                        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                                                            +
                                                            {category.products
                                                                .length - 4}{' '}
                                                            more
                                                        </span>
                                                    )}
                                            </div>
                                            <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                                                Browse category
                                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {category.products
                                                .slice(0, 2)
                                                .map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50"
                                                    >
                                                        <div className="aspect-[4/3] bg-[radial-gradient(circle_at_top,#dbeafe,transparent_58%),linear-gradient(135deg,#e2e8f0,#f8fafc)]">
                                                            {product.image ? (
                                                                <img
                                                                    src={`/storage/${product.image}`}
                                                                    alt={product.title}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div className="p-4">
                                                            <p className="line-clamp-2 text-sm font-medium text-slate-700">
                                                                {product.title}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </section>
                    )}

                    {filteredUncategorizedProducts.length > 0 && (
                        <section className="mt-16">
                            <div className="mb-8 flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-950">
                                        Other Products
                                    </h2>
                                    <p className="mt-2 text-slate-600">
                                        These items are still available even
                                        though they are not assigned to a public
                                        category yet.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {filteredUncategorizedProducts.map((product) => (
                                    <StorefrontProductCard
                                        key={product.id}
                                        product={product}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {filteredCategories.length === 0 &&
                        filteredUncategorizedProducts.length === 0 && (
                            <div className="mt-20 rounded-2xl border border-gray-100 bg-gray-50 p-12 text-center">
                                <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                                <h3 className="mb-2 text-xl text-gray-900">
                                    No products found
                                </h3>
                                <p className="text-gray-500">
                                    We couldn&apos;t find any categories or
                                    products matching your search.
                                </p>
                            </div>
                        )}
                </main>
                <Footer categories={storefront.categories} />
            </div>
            <FloatingContactActions />
        </>
    );
}
