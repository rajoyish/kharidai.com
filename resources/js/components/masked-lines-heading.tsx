import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(SplitText, ScrollTrigger);

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
 *
 * By default the reveal plays once on mount. Pass `animateOnScroll` to instead
 * drive it with a ScrollTrigger so it replays every time the heading scrolls
 * into view (both directions) as well as on load. When mounting this in an
 * Inertia page whose heading text changes between client-side visits, give it a
 * `key` tied to that text so React remounts it and the split is rebuilt.
 */
export function MaskedLinesHeading({
    className,
    children,
    animateOnScroll = false,
}: {
    className?: string;
    children: ReactNode;
    animateOnScroll?: boolean;
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
                // automatically by GSAP on re-split (e.g. autoSplit on resize).
                onSplit(self) {
                    return gsap.from(self.lines, {
                        ...maskedLinesRevealVars,
                        ...(animateOnScroll
                            ? {
                                  scrollTrigger: {
                                      trigger: element,
                                      // Reveal as it enters; reset once fully
                                      // past the top edge so scrolling back in
                                      // (either direction) replays cleanly.
                                      start: 'top 85%',
                                      end: 'bottom top',
                                      toggleActions:
                                          'restart reset restart reset',
                                  },
                              }
                            : {}),
                    });
                },
            });
        });

        return () => {
            cancelled = true;
            split?.revert();

            // Belt-and-suspenders: kill any ScrollTrigger still bound to this
            // heading so an autoSplit re-split can never orphan one.
            if (animateOnScroll) {
                ScrollTrigger.getAll().forEach((trigger) => {
                    if (trigger.trigger === element) {
                        trigger.kill();
                    }
                });
            }
        };
    }, [animateOnScroll]);

    return (
        <h1 ref={headingRef} className={className}>
            {children}
        </h1>
    );
}
