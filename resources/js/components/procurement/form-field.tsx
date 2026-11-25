import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/** A labelled form control with its hint and validation message. */
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
        <div className={className ?? 'grid gap-2'}>
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
    );
}
