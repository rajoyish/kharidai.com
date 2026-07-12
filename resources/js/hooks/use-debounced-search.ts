import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

/**
 * Keeps a search box in sync with a server-filtered Inertia page, issuing one
 * request after typing pauses instead of one per keystroke.
 *
 * `currentSearch` is the term the server actually filtered by, so the input can
 * seed itself from a shared link and stay quiet while it already agrees with the
 * server — that guard is what keeps the initial mount, and every search-driven
 * reload, from refetching forever.
 *
 * `only` must name every prop the server derives from the search term —
 * including `filters` — or the partial reload would leave `currentSearch` stale
 * and the effect below would never settle.
 */
export function useDebouncedSearch({
    href,
    currentSearch,
    only,
    params,
}: {
    href: string;
    currentSearch: string;
    only?: string[];
    /** Filters the page already applies (type, year, …), carried along so searching does not clear them. */
    params?: Record<string, string | number | undefined>;
}): [string, (value: string) => void] {
    const [searchQuery, setSearchQuery] = useState(currentSearch);

    // Callers pass fresh `only` and `params` objects on every render, so the
    // debounce effect reads them through a ref and keys off their contents
    // instead. Depending on the objects directly would restart the timer, and
    // therefore the debounce, on every render.
    const requestRef = useRef({ only, params });

    useEffect(() => {
        requestRef.current = { only, params };
    });

    const onlyKey = only?.join(',') ?? '';
    const paramsKey = JSON.stringify(params ?? {});

    useEffect(() => {
        if (searchQuery === currentSearch) {
            return;
        }

        const timeout = setTimeout(() => {
            const { only, params } = requestRef.current;

            const query: Record<string, string | number> = {};

            Object.entries(params ?? {}).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    query[key] = value;
                }
            });

            if (searchQuery) {
                query.search = searchQuery;
            }

            router.get(href, query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                ...(only?.length ? { only } : {}),
            });
        }, DEBOUNCE_MS);

        return () => clearTimeout(timeout);
    }, [searchQuery, currentSearch, href, onlyKey, paramsKey]);

    return [searchQuery, setSearchQuery];
}
