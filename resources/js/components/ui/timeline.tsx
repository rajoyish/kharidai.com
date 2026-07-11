import * as React from 'react';

import { cn } from '@/lib/utils';

function Timeline({ className, ...props }: React.ComponentProps<'ol'>) {
    return (
        <ol
            data-slot="timeline"
            className={cn('flex flex-col', className)}
            {...props}
        />
    );
}

function TimelineItem({ className, ...props }: React.ComponentProps<'li'>) {
    return (
        <li
            data-slot="timeline-item"
            className={cn(
                'group/timeline-item relative flex gap-4 pb-6 last:pb-0',
                className,
            )}
            {...props}
        />
    );
}

/**
 * The left rail of a timeline item: renders the dot and a connecting line that
 * grows to fill the item's height. The line is hidden on the last item.
 */
function TimelineIndicator({
    className,
    children,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="timeline-indicator"
            className={cn('relative flex flex-col items-center', className)}
            {...props}
        >
            {children}
            <div className="mt-1 w-px flex-1 bg-border group-last/timeline-item:hidden" />
        </div>
    );
}

function TimelineDot({
    className,
    children,
    ...props
}: React.ComponentProps<'span'>) {
    return (
        <span
            data-slot="timeline-dot"
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border bg-background [&>svg]:size-4',
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}

function TimelineContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="timeline-content"
            className={cn('flex-1 pt-1', className)}
            {...props}
        />
    );
}

function TimelineHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="timeline-header"
            className={cn(
                'flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5',
                className,
            )}
            {...props}
        />
    );
}

function TimelineTitle({ className, ...props }: React.ComponentProps<'p'>) {
    return (
        <p
            data-slot="timeline-title"
            className={cn('text-sm leading-snug font-medium', className)}
            {...props}
        />
    );
}

function TimelineTime({ className, ...props }: React.ComponentProps<'time'>) {
    return (
        <time
            data-slot="timeline-time"
            className={cn(
                'text-xs whitespace-nowrap text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}

function TimelineDescription({
    className,
    ...props
}: React.ComponentProps<'p'>) {
    return (
        <p
            data-slot="timeline-description"
            className={cn('mt-0.5 text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

export {
    Timeline,
    TimelineItem,
    TimelineIndicator,
    TimelineDot,
    TimelineContent,
    TimelineHeader,
    TimelineTitle,
    TimelineTime,
    TimelineDescription,
};
