import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';

const DEBOUNCE_MS = 300;

/**
 * Debounced storefront search box.
 *
 * `currentSearch` is the term the server actually filtered by, so the input can
 * seed itself from a shared link and skip refetching when it already agrees with
 * the server. `only` must name every prop the server derives from the search
 * term — including `filters` — or the partial reload would leave `currentSearch`
 * stale and the effect below would refetch forever.
 */
export function StorefrontSearch({
    href,
    only,
    currentSearch,
    placeholder = 'Search categories or products...',
    className,
}: {
    href: string;
    only: string[];
    currentSearch: string;
    placeholder?: string;
    className?: string;
}) {
    const [searchQuery, setSearchQuery] = useState(currentSearch);

    useEffect(() => {
        if (searchQuery === currentSearch) {
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                href,
                searchQuery ? { search: searchQuery } : {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only,
                },
            );
        }, DEBOUNCE_MS);

        return () => clearTimeout(timeout);
    }, [searchQuery, currentSearch, href, only]);

    return (
        <div className={className}>
            <Input
                type="search"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50 text-base focus-visible:ring-accent sm:flex-1"
            />
        </div>
    );
}
