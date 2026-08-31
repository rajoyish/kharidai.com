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
 * viewer on hover, focus, or touch, mirroring the storefront marketing visual.
 *
 * All motion is GSAP-driven and client-side only. `gsap.matchMedia()` owns the
 * responsive breakpoints, the entrance timeline, and the pointer listeners; its
 * single `revert()` on unmount kills every tween, removes every listener, and
 * strips the inline styles GSAP added — so there are no dangling timers or
 * leaked handlers. On touch devices a card lifts when tapped and settles when
 * another card or empty space is tapped, tracked via a single capture-phase
 * document listener that is also torn down. `prefers-reduced-motion` skips the
 * entrance/lift motion while still placing the cards in their final positions.
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
                // `isDesktop` and `isMobile` together cover every width so the
                // callback always runs — matchMedia only invokes it when at
                // least one query matches, and a lone `min-width` gate would
                // leave phones (where nothing matches) with no positioning.
                isDesktop: '(min-width: 48rem)',
                isMobile: '(max-width: 47.999rem)',
                reduceMotion: '(prefers-reduced-motion: reduce)',
            },
            (context) => {
                const { isDesktop, reduceMotion } = context.conditions as {
                    isDesktop: boolean;
                    isMobile: boolean;
                    reduceMotion: boolean;
                };

                const spread = isDesktop ? 224 : 120;
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

                // Which card the current touch is holding open, plus its
                // matching settle, so a tap elsewhere can put it back.
                let activeCard: HTMLElement | null = null;
                let activeSettle: (() => void) | null = null;

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

                    // On touch there is no hover, so a tap promotes this card
                    // and records how to settle it later. The capture-phase
                    // document listener below has already settled the card that
                    // was previously open before this fires.
                    const activate = () => {
                        activeCard = card;
                        activeSettle = settle;
                        lift();
                    };

                    card.addEventListener('mouseenter', lift);
                    card.addEventListener('mouseleave', settle);
                    card.addEventListener('focusin', lift);
                    card.addEventListener('focusout', settle);
                    card.addEventListener('touchstart', activate, {
                        passive: true,
                    });

                    return () => {
                        card.removeEventListener('mouseenter', lift);
                        card.removeEventListener('mouseleave', settle);
                        card.removeEventListener('focusin', lift);
                        card.removeEventListener('focusout', settle);
                        card.removeEventListener('touchstart', activate);
                    };
                });

                // Settle the open card when a touch lands outside it (empty
                // space, or another card — which then lifts via its own
                // handler). Capture phase guarantees this runs before the
                // per-card `touchstart` above.
                const settleOnOutsideTouch = (event: TouchEvent) => {
                    const target = event.target as Node | null;

                    if (
                        activeCard &&
                        (!target || !activeCard.contains(target))
                    ) {
                        activeSettle?.();
                        activeCard = null;
                        activeSettle = null;
                    }
                };

                document.addEventListener('touchstart', settleOnOutsideTouch, {
                    passive: true,
                    capture: true,
                });

                return () => {
                    document.removeEventListener(
                        'touchstart',
                        settleOnOutsideTouch,
                        { capture: true },
                    );
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
                className="absolute z-20 w-52 transform cursor-pointer rounded-3xl border border-border bg-card p-6 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-64"
            >
                <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-accent-surface text-accent-strong shadow-inner">
                    <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-center text-lg text-card-foreground">
                    Premium Subscriptions
                </h3>
            </div>

            <div
                data-fan-card
                tabIndex={0}
                className="absolute z-30 w-60 transform cursor-pointer rounded-3xl border border-border bg-card p-6 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-72 md:p-8"
            >
                <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary-text shadow-inner">
                    <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="mb-3 text-center text-xl font-bold text-card-foreground">
                    Find exactly what you need, instantly.
                </h3>
                <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-muted-foreground">
                    <span>{totalItemsCount} items</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <span>24/7 delivery</span>
                </div>
            </div>

            <div
                data-fan-card
                tabIndex={0}
                className="absolute z-20 w-52 transform cursor-pointer rounded-3xl border border-border bg-card p-6 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-64"
            >
                <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-surface text-primary-text shadow-inner">
                    <Archive className="h-4 w-4" />
                </div>
                <h3 className="text-center text-lg text-card-foreground">
                    Trusted Physical Goods
                </h3>
            </div>
        </div>
    );
}
