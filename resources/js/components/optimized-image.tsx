import React from 'react';
import { cn } from '@/lib/utils'; // Assuming tailwind-merge is set up

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    width: number;
    height: number;
    priority?: boolean;
}

export function OptimizedImage({
    src,
    alt,
    width,
    height,
    priority = false,
    className,
    ...props
}: OptimizedImageProps) {
    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            className={cn('object-cover', className)}
            {...props}
        />
    );
}
