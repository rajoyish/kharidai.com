import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

import AppLogo from '@/components/app-logo';
import { FloatingContactActions } from '@/components/floating-contact-actions';
import { Footer } from '@/components/Footer';
import { SeoHead } from '@/components/seo-head';
import { StorefrontProductCard } from '@/components/storefront-product-card';
import { index as cartIndex } from '@/routes/cart';
import { show as showCategory } from '@/routes/categories';
import { home } from '@/routes';
import type {
    PageProps,
    StorefrontCategory,
    StorefrontCategorySummary,
} from '@/types';

export default function Show({
    category,
    categories,
}: {
    category: StorefrontCategory;
    categories: StorefrontCategorySummary[];
}) {
    const { auth, cartCount } = usePage<PageProps>().props;
    const productCount = category.products.length;

    return (
        <>
            <SeoHead />
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_36%,#ffffff_100%)] text-foreground">
                <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Link
                            href={home()}
                            className="group flex items-center gap-2 font-bold"
                        >
                            <AppLogo className="h-9 w-auto transition-transform group-hover:scale-105" />
                        </Link>

                        <nav className="flex items-center gap-4">
                            <Link
                                href={cartIndex()}
                                className="mr-4 flex items-center text-sm font-medium underline-offset-4 hover:underline"
                            >
                                Cart
                                {(cartCount as number) > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                        {cartCount as number}
                                    </span>
                                )}
                            </Link>
                            {auth.user ? (
                                <Link
                                    href={
                                        auth.user.is_admin
                                            ? '/admin'
                                            : '/orders'
                                    }
                                    className="text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    {auth.user.is_admin ? 'Admin' : 'My Orders'}
                                </Link>
                            ) : (
                                <a
                                    href="/auth/google"
                                    className="text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    Log in
                                </a>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-10">
                    <Link
                        href={home()}
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to all categories
                    </Link>

                    <section className="mb-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-8 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.4)] md:p-10">
                        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-semibold uppercase text-primary/80">
                                    Category
                                </p>
                                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                                    {category.name}
                                </h1>
                                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                                    {productCount > 0
                                        ? `Explore all ${productCount} products currently available in ${category.name}.`
                                        : `There are no in-stock products in ${category.name} right now.`}
                                </p>
                            </div>

                            <div className="grid gap-3 rounded-[1.5rem] text-center border border-slate-200 bg-slate-50/90 p-5 text-sm text-slate-600">
                                <span className="font-medium text-slate-500">
                                    Available now
                                </span>
                                <span className="text-3xl font-semibold tracking-tight text-slate-950">
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
                                <h2 className="text-sm font-semibold uppercase text-slate-500">
                                    Browse Categories
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {categories.map((storefrontCategory) => {
                                    const isCurrentCategory =
                                        storefrontCategory.slug ===
                                        category.slug;

                                    return (
                                        <Link
                                            key={storefrontCategory.id}
                                            href={showCategory(
                                                storefrontCategory,
                                            )}
                                            prefetch
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${isCurrentCategory
                                                ? 'border-primary bg-primary text-white shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-primary/30 hover:text-primary'
                                                }`}
                                        >
                                            {storefrontCategory.name}
                                            <span
                                                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${isCurrentCategory
                                                    ? 'bg-white/15 text-white'
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                {storefrontCategory.product_count}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {productCount > 0 ? (
                        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {category.products.map((product) => (
                                <StorefrontProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </section>
                    ) : (
                        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/75 px-8 py-16 text-center shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)]">
                            <h2 className="text-2xl font-semibold text-slate-950">
                                No products available right now
                            </h2>
                            <p className="mx-auto mt-3 max-w-md text-slate-600">
                                This category exists, but it does not have any
                                in-stock products at the moment.
                            </p>
                            <Link
                                href={home()}
                                className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                            >
                                Explore all categories
                            </Link>
                        </section>
                    )}
                </main>

                <Footer />
            </div>
            <FloatingContactActions />
        </>
    );
}
