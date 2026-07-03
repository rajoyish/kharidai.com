import { gsap } from 'gsap';
import { Archive, ShoppingBag, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * Resting transform for each fanned card, keyed by its DOM order
 * (left, center, right). `spread` is resolved responsively at runtime so the
 * side cards sit closer together on small screens.
 */
type RestState = {
    x: number;
    y: number;
    rotate: number;
};

/**
 * A trio of overlapping "hero" cards that fan out on mount and lift toward the
 * viewer on hover/focus, mirroring the storefront marketing visual.
 *
 * All motion is GSAP-driven and client-side only. `gsap.matchMedia()` owns the
 * responsive breakpoints, the entrance timeline, and the hover listeners; its
 * single `revert()` on unmount kills every tween, removes every listener, and
 * strips the inline styles GSAP added — so there are no dangling timers or
 * leaked handlers. `prefers-reduced-motion` skips the entrance/hover motion
 * while still placing the cards in their final positions.
 */
export function HeroFanCards({ totalItemsCount }: { totalItemsCount: number }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const cards = gsap.utils.toArray<HTMLElement>(
            '[data-fan-card]',
            container,
        );

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

                const spread = isDesktop ? 224 : 128;
                const rest: RestState[] = [
                    { x: -spread, y: 48, rotate: -8 }, // left card
                    { x: 0, y: -16, rotate: 0 }, // center card
                    { x: spread, y: 48, rotate: 8 }, // right card
                ];

                cards.forEach((card, index) => {
                    gsap.set(card, {
                        ...rest[index],
                        transformOrigin: 'center center',
                        force3D: true,
                    });
                });

                if (!reduceMotion) {
                    gsap.from(cards, {
                        y: (index) => rest[index].y + 64,
                        rotate: 0,
                        scale: 0.85,
                        opacity: 0,
                        duration: 0.9,
                        stagger: 0.12,
                        ease: 'power3.out',
                        clearProps: 'opacity',
                    });
                }

                const teardowns = cards.map((card, index) => {
                    const lift = () => {
                        // Raise stacking order and promote to its own layer in
                        // the same synchronous write, so the card paints on top
                        // from the first frame instead of one frame late.
                        gsap.set(card, { zIndex: 50, willChange: 'transform' });

                        if (reduceMotion) {
                            return;
                        }

                        gsap.to(card, {
                            y: rest[index].y - 24,
                            rotate: 0,
                            scale: isDesktop ? 1.06 : 1.03,
                            duration: 0.4,
                            ease: 'power2.out',
                            overwrite: 'auto',
                        });
                    };

                    const settle = () => {
                        if (reduceMotion) {
                            gsap.set(card, { clearProps: 'zIndex,willChange' });

                            return;
                        }

                        gsap.to(card, {
                            ...rest[index],
                            scale: 1,
                            duration: 0.5,
                            ease: 'power2.out',
                            overwrite: 'auto',
                            onComplete: () => {
                                // Drop the layer promotion once resting so the
                                // cards aren't permanently composited.
                                gsap.set(card, {
                                    clearProps: 'zIndex,willChange',
                                });
                            },
                        });
                    };

                    card.addEventListener('mouseenter', lift);
                    card.addEventListener('mouseleave', settle);
                    card.addEventListener('focusin', lift);
                    card.addEventListener('focusout', settle);

                    return () => {
                        card.removeEventListener('mouseenter', lift);
                        card.removeEventListener('mouseleave', settle);
                        card.removeEventListener('focusin', lift);
                        card.removeEventListener('focusout', settle);
                    };
                });

                return () => {
                    teardowns.forEach((teardown) => teardown());
                };
            },
        );

        return () => {
            mm.revert();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="perspective-1000 relative z-10 mx-auto mt-20 flex h-64 max-w-5xl justify-center px-4 md:h-80"
        >
            <div
                data-fan-card
                tabIndex={0}
                className="absolute z-20 w-64 transform cursor-pointer rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_0.9375rem_2.5rem_-0.75rem_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
                <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent shadow-inner">
                    <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-center text-lg text-gray-800">
                    Premium Subscriptions
                </h3>
            </div>

            <div
                data-fan-card
                tabIndex={0}
                className="absolute z-30 w-72 transform cursor-pointer rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_1.25rem_3.125rem_-0.75rem_rgba(0,0,0,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
                <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
                    <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="mb-3 text-center text-xl font-bold text-gray-900">
                    Find exactly what you need, instantly.
                </h3>
                <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-gray-400">
                    <span>{totalItemsCount} items</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <span>24/7 delivery</span>
                </div>
            </div>

            <div
                data-fan-card
                tabIndex={0}
                className="absolute z-20 w-64 transform cursor-pointer rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_0.9375rem_2.5rem_-0.75rem_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
                <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary shadow-inner">
                    <Archive className="h-4 w-4" />
                </div>
                <h3 className="text-center text-lg text-gray-800">
                    Trusted Physical Goods
                </h3>
            </div>
        </div>
    );
}
