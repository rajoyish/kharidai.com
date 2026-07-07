import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Clamp a raw count to a compact, display-safe string. Values above `max`
 * collapse to `${max}+` so the badge never grows past three digits (e.g. 999+),
 * keeping its width predictable across single-, double- and triple-digit counts.
 */
export function formatCount(count: number, max = 999): string {
    const safe = Math.max(0, Math.floor(count));

    return safe > max ? `${max}+` : String(safe);
}

const countBadgeVariants = cva(
    'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs leading-none font-semibold tabular-nums',
    {
        variants: {
            tone: {
                neutral: 'bg-muted text-muted-foreground',
                primary: 'bg-primary/15 text-primary',
                contrast: 'bg-white/20 text-white',
            },
        },
        defaultVariants: {
            tone: 'neutral',
        },
    },
);

type CountBadgeProps = React.ComponentProps<'span'> &
    VariantProps<typeof countBadgeVariants> & {
        /** The raw count to display; negatives and decimals are normalized. */
        count: number;
        /** Highest value shown verbatim before collapsing to `${max}+`. */
        max?: number;
    };

/**
 * A digit-adaptive count badge: a perfect circle for single-digit counts that
 * grows into a stadium/pill for two- and three-digit counts, so 1, 12 and 123
 * all read cleanly without distorting. Because it is fully rounded, it stays
 * concentric inside any rounded parent (pill, card or button), fixing the
 * nested-corner mismatch you get from ad-hoc `px`/`py` count badges.
 *
 * Uses semantic color tokens so it drops into both the storefront and admin
 * panels (including dark mode) unchanged.
 */
export function CountBadge({
    count,
    max,
    tone,
    className,
    ...props
}: CountBadgeProps) {
    return (
        <span
            data-slot="count-badge"
            className={cn(countBadgeVariants({ tone }), className)}
            {...props}
        >
            {formatCount(count, max)}
        </span>
    );
}

export { countBadgeVariants };
