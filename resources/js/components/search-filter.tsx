import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { cn } from '@/lib/utils';

/**
 * Debounced search box for the admin index pages. The server owns the filtering;
 * `currentSearch` is the term it filtered by. See {@link useDebouncedSearch} for
 * the request behaviour and the `only` contract.
 */
export function SearchFilter({
    href,
    currentSearch,
    placeholder = 'Search...',
    only,
    params,
    className,
}: {
    href: string;
    currentSearch: string;
    placeholder?: string;
    only?: string[];
    /** Filters the page already applies, carried along so searching does not clear them. */
    params?: Record<string, string | number | undefined>;
    className?: string;
}) {
    const [searchQuery, setSearchQuery] = useDebouncedSearch({
        href,
        currentSearch,
        only,
        params,
    });

    return (
        <div className={cn('relative w-full sm:w-64', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="pl-9"
            />
        </div>
    );
}
