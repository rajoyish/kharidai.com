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
                <StorefrontHeader />
                {children}
                <Footer />
            </div>
            <FloatingContactActions />
        </>
    );
}
