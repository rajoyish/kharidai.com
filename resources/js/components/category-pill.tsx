import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { CountBadge } from '@/components/count-badge';
import { TruncatedText } from '@/components/truncated-text';
import { LINK_PREFETCH } from '@/lib/prefetch';
import { cn } from '@/lib/utils';

const pillVariants = cva(
    'inline-flex items-center gap-2 rounded-full border font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
    {
        variants: {
            state: {
                default:
                    'border-border bg-card text-foreground hover:border-primary/40 hover:text-primary',
                active: 'border-primary bg-primary text-white shadow-sm',
                expanded: 'border-primary bg-primary/10 text-primary shadow-sm',
            },
            size: {
                default: 'px-4 py-2 text-sm',
                sm: 'px-3 py-1.5 text-sm',
            },
        },
        defaultVariants: {
            state: 'default',
            size: 'default',
        },
    },
);

/** Maps each pill state to the count badge tone that reads on top of it. */
const badgeToneForState = {
    default: 'neutral',
    active: 'contrast',
    expanded: 'primary',
} as const;

type PillState = NonNullable<VariantProps<typeof pillVariants>['state']>;

type CategoryPillProps = VariantProps<typeof pillVariants> & {
    /** Category label shown in the pill. */
    name: string;
    /** Optional product/child count; hidden when omitted. Renders via CountBadge. */
    count?: number | null;
    /** Inertia destination; renders a `<Link>` when set, otherwise a static `<span>`. */
    href?: InertiaLinkProps['href'];
    /** Prefetch the destination, using the app's shared link strategy. */
    prefetch?: boolean;
    className?: string;
};

/**
 * A rounded category "pill" (name + adaptive count) for browsing category
 * navigation. Composes {@link CountBadge} so the count stays concentric and
 * legible whether it is 1, 12 or 123. Renders as an Inertia `<Link>` when given
 * an `href`, so it works client-side in both the storefront and admin panels.
 */
export function CategoryPill({
    name,
    count,
    href,
    prefetch,
    state,
    size,
    className,
}: CategoryPillProps) {
    const resolvedState: PillState = state ?? 'default';
    const classes = cn(pillVariants({ state, size }), className);

    const content = (
        <>
            <TruncatedText className="inline-block max-w-[150px] align-bottom sm:max-w-[200px]">
                {name}
            </TruncatedText>
            {typeof count === 'number' && (
                <CountBadge
                    count={count}
                    tone={badgeToneForState[resolvedState]}
                />
            )}
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                prefetch={prefetch ? LINK_PREFETCH : false}
                className={classes}
            >
                {content}
            </Link>
        );
    }

    return <span className={classes}>{content}</span>;
}
