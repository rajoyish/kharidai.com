import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

const COPIED_FEEDBACK_MS = 1500;

/**
 * Copies `value` to the clipboard and confirms it by swapping to a checkmark for
 * a moment. The confirmation is local state rather than the hook's `copiedText`
 * so that several buttons sharing a page each own their own feedback.
 */
export function CopyButton({
    value,
    label = 'value',
    className,
}: {
    value: string;
    /** Names the thing being copied, e.g. "order number", for the tooltip and screen readers. */
    label?: string;
    className?: string;
}) {
    const [, copy] = useClipboard();
    const [hasCopied, setHasCopied] = useState(false);

    useEffect(() => {
        if (!hasCopied) {
            return;
        }

        const timeout = setTimeout(
            () => setHasCopied(false),
            COPIED_FEEDBACK_MS,
        );

        return () => clearTimeout(timeout);
    }, [hasCopied]);

    const handleCopy = async () => {
        if (await copy(value)) {
            setHasCopied(true);
        }
    };

    // The app is already wrapped in a single TooltipProvider (app.tsx), so this
    // renders a bare Tooltip rather than nesting one provider per button.
    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        aria-label={`Copy ${label}`}
                        className={cn(
                            'size-7 shrink-0 text-muted-foreground hover:text-foreground',
                            className,
                        )}
                    >
                        {hasCopied ? (
                            <Check className="size-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {hasCopied ? 'Copied!' : `Copy ${label}`}
                </TooltipContent>
            </Tooltip>
            <span aria-live="polite" className="sr-only">
                {hasCopied ? `${value} copied to clipboard` : ''}
            </span>
        </>
    );
}

/**
 * An order number paired with its copy button. `children` renders the number
 * itself so callers can wrap it in a link where the order is navigable.
 */
export function CopyableOrderNumber({
    orderNumber,
    children,
    className,
}: {
    orderNumber: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <span className={cn('inline-flex items-center gap-1', className)}>
            {children ?? orderNumber}
            <CopyButton value={orderNumber} label="order number" />
        </span>
    );
}
