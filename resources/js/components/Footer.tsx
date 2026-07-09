import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import { index as blogIndex } from '@/routes/blog';
import { index as digitalProducts } from '@/routes/digital-products';
import { show as showPage } from '@/routes/pages';
import { index as physicalProducts } from '@/routes/physical-products';
import { index as services } from '@/routes/services';
import type { SharedData } from '@/types';

const shopLinks = [
    { label: 'Digital Products', href: digitalProducts() },
    { label: 'Physical Products', href: physicalProducts() },
    { label: 'Services', href: services() },
];

export function Footer() {
    const { storefront } = usePage<SharedData>().props;
    const pages = storefront?.footerPages ?? [];
    const links = storefront?.hasBlogPosts
        ? [...shopLinks, { label: 'Blog', href: blogIndex() }]
        : shopLinks;
    const logoRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            },
            {
                threshold: 0.5,
            },
        );

        const currentLogoRef = logoRef.current;

        if (currentLogoRef) {
            observer.observe(currentLogoRef);
        }

        return () => {
            if (currentLogoRef) {
                observer.unobserve(currentLogoRef);
            }
        };
    }, []);

    return (
        <footer className="relative w-full overflow-hidden border-t border-primary-foreground/10 bg-blue-950 pt-16 pb-8 text-primary-foreground">
            {/* Top Section (Navigation) */}
            <div className="container mx-auto mb-16 px-4 md:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {/* Column 1: Brand / Logo */}
                    <div className="col-span-1 flex flex-col items-start md:col-span-1">
                        <Link href={home()} prefetch className="mb-6">
                            <AppLogo className="h-10 w-auto" />
                        </Link>
                        <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">
                            Your all-in-one marketplace for digital goods,
                            premium subscriptions, trusted services, and
                            physical products.
                        </p>
                    </div>

                    {/* Column 2: Shop by type */}
                    <div>
                        <h3 className="mb-4 text-sm font-bold tracking-wider text-primary-foreground uppercase">
                            Shop
                        </h3>
                        <ul className="space-y-3">
                            {links.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        prefetch
                                        className="text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Contact */}
                    <div>
                        <h3 className="mb-4 text-sm font-bold tracking-wider text-primary-foreground uppercase">
                            Contact
                        </h3>
                        <ul className="space-y-3">
                            <li>
                                <a
                                    href="mailto:support@kharidai.com"
                                    className="text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                                >
                                    support@kharidai.com
                                </a>
                            </li>
                            <li>
                                <a
                                    href="tel:+9779740820005"
                                    className="text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                                >
                                    +977 974-0820005
                                </a>
                            </li>
                            <li>
                                <address className="mt-2 text-sm text-primary-foreground/70 not-italic">
                                    Kathmandu, Nepal
                                    <br />
                                    Bagmati Province
                                </address>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Section (Copyright & Animated Text) */}
            <div className="container mx-auto px-4 md:px-8">
                <div className="mb-8 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 md:flex-row">
                    <p className="flex-1 text-center text-sm font-medium text-primary-foreground/70 md:text-left">
                        &copy; {new Date().getFullYear()} Kharidai.com | All
                        rights reserved.
                    </p>

                    <div className="flex flex-1 items-center justify-center">
                        <span className="mr-2 text-sm font-medium text-primary-foreground/50">
                            Crafted by
                        </span>
                        <AppLogo className="h-5 w-auto opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0" />
                    </div>

                    <div className="flex flex-1 flex-wrap justify-center gap-x-6 gap-y-2 md:justify-end">
                        {pages.map((page) => (
                            <Link
                                key={page.slug}
                                href={showPage(page.slug)}
                                prefetch
                                className="text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                            >
                                {page.title}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Massive Animated Logo Container */}
                <div className="mt-12 mb-4 flex w-full justify-center">
                    <div
                        ref={logoRef}
                        className="faded-bottom relative w-full max-w-5xl px-4 opacity-30 mix-blend-screen saturate-50"
                    >
                        {/* Define the gradient for the SVG fill */}
                        <svg width="0" height="0" className="absolute">
                            <defs>
                                <linearGradient
                                    id="brand-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%"
                                >
                                    <stop offset="0%" stopColor="#8dc641" />
                                    <stop offset="100%" stopColor="#1176bc" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Base Hollow Logo */}
                        <AppLogo className="hollow-logo h-auto w-full" />

                        {/* Filled Animated Logo Layer */}
                        <div
                            className="pointer-events-none absolute inset-0 px-4 transition-all duration-[2000ms] ease-out"
                            style={{
                                clipPath: isVisible
                                    ? 'inset(0 0% 0 0)'
                                    : 'inset(0 100% 0 0)',
                            }}
                        >
                            <AppLogo className="filled-logo h-auto w-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Styles for the stroke, background clip, and animation */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                /* Target all paths inside the base logo to make them invisible but keep layout space */
                .hollow-logo path {
                    fill: transparent !important;
                    stroke: none !important;
                }

                /* Target all paths inside the filled logo to color them with brand gradient */
                .filled-logo path {
                    fill: url(#brand-gradient) !important;
                    stroke: none !important;
                }

                /* Fade the entire logo container at the bottom */
                .faded-bottom {
                    -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
                    mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
                }
            `,
                }}
            />
        </footer>
    );
}
