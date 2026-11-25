import { useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type GlowCardProps = {
    children: ReactNode;
    className?: string;
    /** Classes for the inner surface that holds the content. */
    contentClassName?: string;
    /** Any CSS colour; drives both the border glow and the inner spotlight. */
    glowColor?: string;
    /** Radius of the pointer-following glow, in pixels. */
    glowSize?: number;
};

/**
 * A card whose border and surface light up around the pointer.
 *
 * The outer element is a 1px "frame" painted with a radial gradient centred on
 * the pointer; the inner surface sits on top of it, so only the frame's edge
 * shows the bright glow while a fainter spotlight tints the surface. Pointer
 * coordinates are written to CSS variables once per animation frame, so moving
 * the mouse never re-renders React.
 */
export function GlowCard({
    children,
    className,
    contentClassName,
    glowColor = 'var(--primary)',
    glowSize = 320,
}: GlowCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number | null>(null);

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const card = cardRef.current;

        if (!card || frameRef.current !== null) {
            return;
        }

        const { clientX, clientY } = event;

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const rect = card.getBoundingClientRect();

            card.style.setProperty('--glow-x', `${clientX - rect.left}px`);
            card.style.setProperty('--glow-y', `${clientY - rect.top}px`);
            card.style.setProperty('--glow-opacity', '1');
        });
    };

    const handlePointerLeave = () => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }

        cardRef.current?.style.setProperty('--glow-opacity', '0');
    };

    const gradient = (strength: string) =>
        `radial-gradient(${glowSize}px circle at var(--glow-x, 50%) var(--glow-y, 0%), color-mix(in oklab, ${glowColor} ${strength}, transparent), transparent 70%)`;

    return (
        <div
            ref={cardRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{ '--glow-opacity': '0' } as CSSProperties}
            className={cn(
                'group/glow relative isolate rounded-2xl bg-border p-px',
                className,
            )}
        >
            {/* Border glow: shows through the 1px gap around the surface. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-(--glow-opacity) transition-opacity duration-300"
                style={{ backgroundImage: gradient('100%') }}
            />

            <div
                className={cn(
                    'relative overflow-hidden rounded-[calc(1rem-1px)] bg-card',
                    contentClassName,
                )}
            >
                {/* Soft spotlight across the surface itself. */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-(--glow-opacity) transition-opacity duration-300"
                    style={{ backgroundImage: gradient('14%') }}
                />
                <div className="relative">{children}</div>
            </div>
        </div>
    );
}
