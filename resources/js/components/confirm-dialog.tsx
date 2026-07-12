import type { ReactNode } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

/**
 * An accessible replacement for `window.confirm()` for destructive actions.
 *
 * Callers render this only while a target is selected (`{target && <ConfirmDialog ... />}`)
 * so a single dialog serves a whole table instead of one dialog per row, and the
 * title/description can safely read from the non-null target.
 */
export function ConfirmDialog({
    title,
    description,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onConfirm,
    onOpenChange,
}: {
    title: ReactNode;
    description: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <AlertDialog open onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        className={buttonVariants({ variant: 'destructive' })}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
