import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps a set of full-height "panel" sections and applies GSAP's
 * "Pinned panels with overscroll" effect (GreenSock pen bGRdvMy): each panel
 * pins once it fills the viewport, then scales down and fades while the next
 * panel scrolls up over it, producing a layered, stacked scroll.
 *
 * Mark each panel with `data-panel` and its scrollable content with
 * `data-panel-inner`. When a panel's content is taller than the viewport its
 * content "fake scrolls" through first (via the inner element) before the
 * scale/fade begins, so nothing is skipped past.
 *
 * All motion is client-side and desktop-only. `gsap.matchMedia()` owns the
 * breakpoint + `prefers-reduced-motion` conditions; its single `revert()` on
 * unmount kills every ScrollTrigger, removes the pin-spacers and scroll
 * listeners, and strips every inline style GSAP added — so an Inertia page swap
 * leaves no dangling triggers, listeners, or mutated DOM behind.
 */
export function PinnedPanels({ children }: { children: ReactNode }) {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;

        if (!root) {
            return;
        }

        const mm = gsap.matchMedia();

        mm.add(
            {
                isDesktop: '(min-width: 48rem)',
                reduceMotion: '(prefers-reduced-motion: reduce)',
            },
            (context) => {
                const { isDesktop, reduceMotion } = context.conditions as {
                    isDesktop: boolean;
                    reduceMotion: boolean;
                };

                // On small screens or when reduced motion is requested, leave
                // the sections as ordinary stacked content — no pinning.
                if (!isDesktop || reduceMotion) {
                    return;
                }

                const panels = gsap.utils.toArray<HTMLElement>(
                    '[data-panel]',
                    root,
                );

                panels.forEach((panel) => {
                    const inner =
                        panel.querySelector<HTMLElement>(
                            '[data-panel-inner]',
                        ) ?? panel;

                    // Guarantee the panel fills the viewport while pinned so the
                    // outgoing panel is fully covered by the incoming one. Set
                    // via GSAP so matchMedia's revert() restores it cleanly.
                    gsap.set(panel, { minHeight: '100vh' });

                    const windowHeight = window.innerHeight;
                    const contentHeight = inner.offsetHeight;
                    const difference = contentHeight - windowHeight;

                    // Fraction of the pinned scroll spent "fake scrolling" the
                    // inner content of a panel taller than the viewport. The
                    // scale/fade always plays over exactly one viewport height.
                    const fakeScrollRatio =
                        difference > 0
                            ? difference / (difference + windowHeight)
                            : 0;

                    if (fakeScrollRatio) {
                        // Add just enough spacing so the next panel arrives only
                        // after the content has scrolled through.
                        gsap.set(panel, {
                            marginBottom: contentHeight * fakeScrollRatio,
                        });
                    }

                    const timeline = gsap.timeline({
                        scrollTrigger: {
                            trigger: panel,
                            start: 'bottom bottom',
                            end: () =>
                                fakeScrollRatio
                                    ? `+=${inner.offsetHeight}`
                                    : 'bottom top',
                            pin: true,
                            pinSpacing: false,
                            scrub: true,
                        },
                    });

                    if (fakeScrollRatio) {
                        timeline.to(inner, {
                            yPercent: -100,
                            y: windowHeight,
                            ease: 'none',
                            duration: 1 / (1 - fakeScrollRatio) - 1,
                        });
                    }

                    timeline
                        .fromTo(
                            panel,
                            { scale: 1, opacity: 1 },
                            { scale: 0.7, opacity: 0.5, duration: 0.9 },
                        )
                        .to(panel, { opacity: 0, duration: 0.1 });
                });

                // Pin positions depend on final layout, so recompute once fonts
                // and lazy imagery settle. `active` stops a late refresh from
                // firing after this context has already been reverted.
                let active = true;

                const refresh = () => {
                    if (active) {
                        ScrollTrigger.refresh();
                    }
                };

                document.fonts.ready.then(refresh);
                window.addEventListener('load', refresh);

                return () => {
                    active = false;
                    window.removeEventListener('load', refresh);
                };
            },
        );

        return () => {
            mm.revert();
        };
    }, []);

    return <div ref={rootRef}>{children}</div>;
}
