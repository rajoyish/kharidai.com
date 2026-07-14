import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';

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
 *
 * Every remaining prop (and the ref) is forwarded to the anchor. That is load
 * bearing: inside a dropdown this is wrapped in a `DropdownMenuItem asChild`,
 * which clones it with the handlers Radix uses to register a selection. Swallow
 * those props and the link still navigates, but the menu never closes.
 */
export function StorefrontNavLink({
    link,
    className,
    children,
    ...props
}: {
    link: MenuLink;
    children?: ReactNode;
} & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
    const href = link.href ?? '';
    const label = children ?? link.label;

    if (link.opensInNewTab || isExternalHref(href)) {
        return (
            <a
                // Inertia types its own ref as `unknown`; at this branch the
                // element really is an anchor.
                {...(props as ComponentProps<'a'>)}
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
        <Link {...props} href={href} prefetch className={className}>
            {label}
        </Link>
    );
}
