import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PagePanelProps {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    variant?: 'card' | 'transparent';
}

export function PagePanel({
    title,
    description,
    actions,
    children,
    className = '',
    variant = 'card',
}: PagePanelProps) {
    return (
        <div
            className={cn(
                'flex w-full flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6 lg:p-8',
                className,
            )}
        >
            {(title || description || actions) && (
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        {title && (
                            <h1 className="text-2xl font-bold tracking-tight">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex shrink-0 items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>
            )}
            <div
                className={`flex-1 ${
                    variant === 'card'
                        ? 'overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm'
                        : ''
                } ${className}`}
            >
                {children}
            </div>
        </div>
    );
}
