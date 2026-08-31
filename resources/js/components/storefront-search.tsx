import { Input } from '@/components/ui/input';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';

/**
 * Debounced storefront search box. The request behaviour, including the `only`
 * contract, lives in {@link useDebouncedSearch}.
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
    const [searchQuery, setSearchQuery] = useDebouncedSearch({
        href,
        currentSearch,
        only,
    });

    return (
        <div className={className}>
            <Input
                type="search"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 w-full rounded-xl border-input bg-card text-base focus-visible:ring-ring sm:flex-1"
            />
        </div>
    );
}
