import { lazy, Suspense, useState } from 'react';

import { cn } from '@/lib/utils';

const ImageLightbox = lazy(() => import('@/components/image-lightbox'));

interface LightboxTriggerClick {
    altKey: boolean;
    button: number;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

interface LightboxImageLinkProps {
    alt: string;
    ariaLabel: string;
    className?: string;
    imageClassName?: string;
    src: string;
    /**
     * `eager` for the image above the fold (the product hero), so it is never
     * deferred and can serve as the LCP element. Everything else stays lazy.
     */
    loading?: 'eager' | 'lazy';
}

interface LightboxImageAnchorProps extends LightboxImageLinkProps {
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function shouldOpenLightboxFromClick(
    event: LightboxTriggerClick,
): boolean {
    return (
        event.button === 0 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
    );
}

export function LightboxImageAnchor({
    alt,
    ariaLabel,
    className,
    imageClassName,
    onClick,
    src,
    loading = 'lazy',
}: LightboxImageAnchorProps) {
    return (
        <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className={cn(
                'block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                className,
            )}
            aria-label={ariaLabel}
        >
            <img
                src={src}
                alt={alt}
                loading={loading}
                decoding={loading === 'eager' ? 'sync' : 'async'}
                className={imageClassName}
            />
        </a>
    );
}

export function LightboxImageLink({
    alt,
    ariaLabel,
    className,
    imageClassName,
    src,
    loading,
}: LightboxImageLinkProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <LightboxImageAnchor
                alt={alt}
                ariaLabel={ariaLabel}
                className={className}
                imageClassName={imageClassName}
                src={src}
                loading={loading}
                onClick={(event) => {
                    if (!shouldOpenLightboxFromClick(event)) {
                        return;
                    }

                    event.preventDefault();
                    setIsOpen(true);
                }}
            />

            {isOpen && (
                <Suspense fallback={null}>
                    <ImageLightbox
                        open={isOpen}
                        close={() => setIsOpen(false)}
                        slides={[{ src }]}
                    />
                </Suspense>
            )}
        </>
    );
}
