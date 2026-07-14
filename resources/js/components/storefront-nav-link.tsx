import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import type { MenuLink } from '@/types/storefront';

/**
 * Anything Inertia cannot handle as a client-side visit: another origin, or a
 * non-HTTP scheme an admin may have typed into a custom menu item.
 */
function isExternalHref(href: string): boolean {
    return (
        /^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href)
    );
}

/**
 * Renders one admin-built menu link. Internal destinations become Inertia
 * visits; external ones — and anything the admin marked "open in a new tab" —
 * fall back to a plain anchor with the usual `noopener` hardening.
 */
export function StorefrontNavLink({
    link,
    className,
    children,
}: {
    link: MenuLink;
    className?: string;
    children?: ReactNode;
}) {
    const href = link.href ?? '';
    const label = children ?? link.label;

    if (link.opensInNewTab || isExternalHref(href)) {
        return (
            <a
                href={href}
                className={className}
                target={link.opensInNewTab ? '_blank' : undefined}
                rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
            >
                {label}
            </a>
        );
    }

    return (
        <Link href={href} prefetch className={className}>
            {label}
        </Link>
    );
}
