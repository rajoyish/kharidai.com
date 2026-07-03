import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import { index as cartIndex } from '@/routes/cart';
import { show as showCategory } from '@/routes/categories';
import type { StorefrontNavigationCategory } from '@/types';

export function Footer({
    categories,
}: {
    categories: StorefrontNavigationCategory[];
}) {
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
            }
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

    const halfCategories = Math.ceil(categories.length / 2);
    const leftCategories = categories.slice(0, halfCategories);
    const rightCategories = categories.slice(halfCategories);

    return (
        <footer className="w-full bg-blue-950 text-primary-foreground pt-16 pb-8 border-t border-primary-foreground/10 overflow-hidden relative">
            {/* Top Section (Navigation) */}
            <div className="container mx-auto px-4 md:px-8 mb-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Column 1: Brand / Logo */}
                    <div className="col-span-1 md:col-span-1 flex flex-col items-start">
                        <Link href={home()} prefetch className="mb-6">
                            <AppLogo className="h-10 w-auto" />
                        </Link>
                        <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
                            Your all-in-one marketplace for digital goods, premium subscriptions, trusted services, and physical products.
                        </p>
                    </div>

                    {/* Column 2: Categories (Left) */}
                    <div>
                        <h3 className="text-primary-foreground font-bold mb-4 tracking-wider text-sm uppercase">Shop Categories</h3>
                        <ul className="space-y-3">
                            {leftCategories.map((category) => (
                                <li key={category.id}>
                                    <Link href={showCategory(category)} prefetch className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-medium">
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Categories (Right) */}
                    <div>
                        <h3 className="text-primary-foreground font-bold mb-4 tracking-wider text-sm uppercase">Explore More</h3>
                        <ul className="space-y-3">
                            {rightCategories.map((category) => (
                                <li key={category.id}>
                                    <Link href={showCategory(category)} prefetch className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-medium">
                                        {category.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Contact */}
                    <div>
                        <h3 className="text-primary-foreground font-bold mb-4 tracking-wider text-sm uppercase">Contact</h3>
                        <ul className="space-y-3">
                            <li>
                                <a href="mailto:support@kharidai.com" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-medium">
                                    support@kharidai.com
                                </a>
                            </li>
                            <li>
                                <a href="tel:+9779740820005" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm font-medium">
                                    +977 974-0820005
                                </a>
                            </li>
                            <li>
                                <address className="text-primary-foreground/70 not-italic mt-2 text-sm">
                                    Kathmandu, Nepal<br />
                                    Bagmati Province
                                </address>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Section (Copyright & Animated Text) */}
            <div className="container mx-auto px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center border-t border-primary-foreground/10 pt-8 mb-8 gap-4">
                    <p className="text-primary-foreground/70 text-sm font-medium text-center md:text-left flex-1">
                        &copy; {new Date().getFullYear()} Kharidai.com | All rights reserved.
                    </p>

                    <div className="flex-1 flex justify-center items-center">
                        <span className="text-primary-foreground/50 text-sm font-medium mr-2">Crafted by</span>
                        <AppLogo className="h-5 w-auto grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                    </div>

                    <div className="flex space-x-6 flex-1 justify-center md:justify-end">
                        <Link href={home()} prefetch className="text-primary-foreground/70 hover:text-primary-foreground text-sm font-medium transition-colors">Home</Link>
                        <Link href={cartIndex()} prefetch className="text-primary-foreground/70 hover:text-primary-foreground text-sm font-medium transition-colors">Cart</Link>
                    </div>
                </div>

                {/* Massive Animated Logo Container */}
                <div className="w-full flex justify-center mt-12 mb-4">
                    <div ref={logoRef} className="relative w-full max-w-5xl px-4 faded-bottom opacity-30 saturate-50 mix-blend-screen">
                        {/* Define the gradient for the SVG fill */}
                        <svg width="0" height="0" className="absolute">
                            <defs>
                                <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#8dc641" />
                                    <stop offset="100%" stopColor="#1176bc" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Base Hollow Logo */}
                        <AppLogo className="w-full h-auto hollow-logo" />

                        {/* Filled Animated Logo Layer */}
                        <div
                            className="absolute inset-0 px-4 transition-all duration-[2000ms] ease-out pointer-events-none"
                            style={{
                                clipPath: isVisible ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)'
                            }}
                        >
                            <AppLogo className="w-full h-auto filled-logo" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Styles for the stroke, background clip, and animation */}
            <style dangerouslySetInnerHTML={{
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
            `}} />
        </footer>
    );
}
