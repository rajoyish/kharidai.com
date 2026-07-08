import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TruncatedTextProps extends React.ComponentProps<'span'> {
    asChild?: boolean;
}

export function TruncatedText({
    children,
    title,
    className,
    asChild = false,
    ...props
}: TruncatedTextProps) {
    const Comp = asChild ? Slot : 'span';
    // If not asChild, we can try to extract title from string children
    const text =
        title ??
        (!asChild && typeof children === 'string' ? children : undefined);

    return (
        <Comp
            title={text}
            className={cn('truncate', asChild ? '' : 'block', className)}
            {...props}
        >
            {children}
        </Comp>
    );
}
