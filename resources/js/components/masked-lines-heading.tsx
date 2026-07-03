import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(SplitText);

/**
 * SplitText options that build the "masked lines" structure: each rendered
 * line is wrapped in its own overflow-clipped mask, and `autoSplit` re-splits
 * on resize/font swap.
 */
export const maskedLinesSplitVars = {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
} as const;

/**
 * Tween vars for the reveal. `yPercent` above 100 parks each line fully below
 * its mask so it slides up into view, and `stagger` reveals lines one by one.
 */
export const maskedLinesRevealVars = {
    yPercent: 110,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: 'expo.out',
} as const;

/**
 * Renders a heading whose text reveals line-by-line from behind a mask,
 * mirroring GSAP's "Masked Lines with SplitText" demo.
 *
 * The animation is client-side only (runs inside useEffect), waits for fonts
 * so lines are measured correctly, respects `prefers-reduced-motion`, and
 * fully reverts the SplitText instance on unmount to avoid DOM/tween leaks.
 */
export function MaskedLinesHeading({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const element = headingRef.current;

        if (!element) {
            return;
        }

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (prefersReducedMotion) {
            return;
        }

        let split: SplitText | undefined;
        let cancelled = false;

        // Wait for web fonts so line breaks are measured against the final
        // typography instead of the fallback font.
        document.fonts.ready.then(() => {
            if (cancelled) {
                return;
            }

            split = SplitText.create(element, {
                ...maskedLinesSplitVars,
                // The tween returned from onSplit is tracked and reverted
                // automatically by GSAP on re-split.
                onSplit(self) {
                    return gsap.from(self.lines, maskedLinesRevealVars);
                },
            });
        });

        return () => {
            cancelled = true;
            split?.revert();
        };
    }, []);

    return (
        <h1 ref={headingRef} className={className}>
            {children}
        </h1>
    );
}
