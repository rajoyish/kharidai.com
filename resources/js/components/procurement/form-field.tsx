import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A labelled form control with its hint and validation message. Its rows pack
 * to the top, so when a neighbour in a form grid carries a hint the extra
 * height falls below this field instead of pushing its control out of line.
 */
export function FormField({
    id,
    label,
    hint,
    error,
    children,
    className,
}: {
    id: string;
    label: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid content-start gap-2', className)}>
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
    );
}
