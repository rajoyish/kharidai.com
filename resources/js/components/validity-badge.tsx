import { CalendarClock } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A validity period as people say it: whole years in years ("1 year",
 * "2 years"), anything else in months ("1 month", "18 months").
 */
export function formatValidity(months: number): string {
    if (months % 12 === 0) {
        const years = months / 12;

        return `${years} ${years === 1 ? 'year' : 'years'}`;
    }

    return `${months} ${months === 1 ? 'month' : 'months'}`;
}

type ValidityBadgeProps = {
    /** The variant's validity; nothing renders when it has none. */
    months?: number | null;
    /** `sm` fits beside compact chips, such as the orders list. */
    size?: 'sm' | 'md';
    className?: string;
};

/**
 * How long a subscription variant lasts, as a small calendar pill. Renders
 * nothing for variants without a validity (lifetime or one-time purchases),
 * so callers can drop it in unconditionally.
 */
export function ValidityBadge({
    months,
    size = 'md',
    className,
}: ValidityBadgeProps) {
    if (!months) {
        return null;
    }

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 font-medium whitespace-nowrap text-muted-foreground transition-colors',
                size === 'sm'
                    ? 'px-1.5 py-0.5 text-[11px] leading-none'
                    : 'px-2.5 py-0.5 text-xs',
                className,
            )}
        >
            <CalendarClock
                className={size === 'sm' ? 'size-3' : 'size-3.5'}
                aria-hidden
            />
            <span className="sr-only">Valid for</span>
            {formatValidity(months)}
        </span>
    );
}
