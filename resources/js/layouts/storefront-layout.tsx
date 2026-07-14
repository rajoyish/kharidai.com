import type { PropsWithChildren } from 'react';

import { FloatingContactActions } from '@/components/floating-contact-actions';
import { Footer } from '@/components/Footer';
import { StorefrontHeader } from '@/components/storefront-header';

export function StorefrontLayout({
    children,
    className = 'flex min-h-screen flex-col bg-background text-foreground',
}: PropsWithChildren<{ className?: string }>) {
    return (
        <>
            <div className={className}>
                {/* The nav can run to a dozen links and dropdowns. Without this, a
                    keyboard user tabs through every one of them on every page
                    before reaching the content. Visible only once focused. */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
                >
                    Skip to content
                </a>

                <StorefrontHeader />

                {/* Pages bring their own <main>; this wrapper only gives the skip
                    link somewhere to land, and keeps the flex chain (and so the
                    bottom-anchored footer) intact. */}
                <div id="main-content" className="flex flex-1 flex-col">
                    {children}
                </div>

                <Footer />
            </div>
            <FloatingContactActions />
        </>
    );
}
