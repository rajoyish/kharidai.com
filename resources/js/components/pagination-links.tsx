import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

/**
 * Page links for a Laravel paginator. Renders nothing for a single page.
 *
 * Pass `only` when the page holds other state worth keeping, such as a form in
 * progress: the visit then reloads just that list, and keeps scroll position
 * and component state so nothing typed elsewhere on the page is lost.
 */
export function PaginationLinks({
    links,
    label,
    only,
}: {
    links: PaginationLink[];
    /** Names the navigation for screen readers, e.g. "Price history pages". */
    label: string;
    only?: string[];
}) {
    // Laravel always sends "Previous" and "Next", so three links is one page.
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav
            className="flex flex-wrap items-center justify-center gap-1 pt-3"
            aria-label={label}
        >
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={index}
                        href={link.url}
                        only={only}
                        preserveScroll
                        preserveState
                        aria-current={link.active ? 'page' : undefined}
                        className={cn(
                            'rounded-md px-3 py-1 text-sm transition-colors',
                            link.active
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={index}
                        className="px-3 py-1 text-sm text-muted-foreground opacity-50"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </nav>
    );
}
