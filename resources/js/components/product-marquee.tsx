import { Link } from '@inertiajs/react';
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { horizontalLoop } from '@/lib/horizontal-loop';
import { LINK_PREFETCH } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { show as showProduct } from '@/routes/products';
import type { StorefrontProduct } from '@/types';

gsap.registerPlugin(Observer);

/** Each row is repeated until it holds at least this many items, so the loop
 * is always wider than the viewport and never shows its seam. */
const MIN_ITEMS_PER_ROW = 12;

/** How hard a scroll kicks the rows, and how long the kick lasts. */
const SCROLL_BOOST = 4;
const BOOST_IN_SECONDS = 0.2;
const BOOST_HOLD_SECONDS = 0.3;
const SETTLE_SECONDS = 1;

type MarqueeRow = {
    products: StorefrontProduct[];
    /** 1 runs leftward with a downward scroll, -1 runs the other way. */
    sign: 1 | -1;
};

function repeatToFill(products: StorefrontProduct[]): StorefrontProduct[] {
    if (products.length === 0) {
        return [];
    }

    const copies = Math.max(1, Math.ceil(MIN_ITEMS_PER_ROW / products.length));

    return Array.from({ length: copies }, () => products).flat();
}

/**
 * The crown from the product template, redrawn as a sticker that sits on the
 * thumbnail's top-right edge. The thumbnail crop keeps only a sliver of the
 * template's own crown, which reads as a stray yellow mark; this covers it and
 * brings the whole crown back.
 */
function MarqueeCrown() {
    return (
        <svg
            viewBox="0 0 64 50"
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 -right-1.5 w-6 rotate-[32deg] drop-shadow-sm md:top-0.5 md:-right-2 md:w-7"
        >
            <path
                d="M8 33 L4 10 L21 22 L32 6 L43 22 L60 10 L56 33 Z"
                fill="#F5A93C"
                strokeLinejoin="round"
                stroke="#F5A93C"
                strokeWidth="2"
            />
            <circle cx="4" cy="9" r="4.5" fill="#F5A93C" />
            <circle cx="32" cy="5" r="4.5" fill="#F5A93C" />
            <circle cx="60" cy="9" r="4.5" fill="#F5A93C" />
            <rect x="7" y="35.5" width="50" height="11" rx="2" fill="#F5A93C" />
            <rect x="7" y="33" width="50" height="2.5" fill="#FCE3BC" />
        </svg>
    );
}

/**
 * Two rows of product links — image, name and an arrow — that loop endlessly
 * in opposite directions and follow the page's scroll direction, after GSAP's
 * directional marquee demo (demos.gsap.com/demo/directional-marquee).
 *
 * Each row is a `horizontalLoop()` timeline. An `Observer` on the window
 * watches wheel and scroll deltas: a change of direction flips both rows, and
 * every scroll gives them a short burst of speed that settles back to a crawl.
 * The arrows turn to point the way their row travels. Hovering or focusing a
 * row pauses it so a moving link can be clicked.
 *
 * Both loops and the observer stop while the marquee is off screen. The loop
 * measures item widths once, so it is rebuilt whenever the marquee changes
 * width. With `prefers-reduced-motion` nothing moves: the first row
 * becomes a plain horizontal scroller and the repeated copies are hidden.
 */
export function ProductMarquee({
    products,
    className,
}: {
    products: StorefrontProduct[];
    className?: string;
}) {
    const rootRef = useRef<HTMLElement>(null);

    const rows: MarqueeRow[] = [
        { products: repeatToFill(products), sign: 1 },
        { products: repeatToFill([...products].reverse()), sign: -1 },
    ];

    useEffect(() => {
        const root = rootRef.current;

        if (!root) {
            return;
        }

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        );

        // Survives rebuilds, so a resize keeps the rows heading the same way.
        let direction: 1 | -1 = 1;
        let context: gsap.Context | null = null;
        let isOnScreen = true;
        // Replaced by each build with one that knows its loops and observer.
        let syncPlayback = () => {};

        const build = () => {
            context?.revert();
            context = null;

            if (reducedMotion.matches) {
                return;
            }

            context = gsap.context(() => {
                const rowElements = gsap.utils.toArray<HTMLElement>(
                    '[data-marquee-row]',
                    root,
                );

                const loops = rowElements.map((row) => {
                    const sign = row.dataset.marqueeSign === '-1' ? -1 : 1;
                    const loop = horizontalLoop(
                        gsap.utils.toArray<HTMLElement>(
                            '[data-marquee-item]',
                            row,
                        ),
                        {
                            repeat: -1,
                            speed: 0.6,
                            paddingRight:
                                parseFloat(getComputedStyle(row).columnGap) ||
                                0,
                        },
                    );

                    // A loop at time 0 with a negative timeScale is already
                    // at its start and never moves, so begin far into the
                    // repeats, where either direction has room to run.
                    loop.totalTime(loop.duration() * 100);
                    loop.timeScale(direction * sign);

                    const state = { loop, sign, isHeld: false };
                    const hold = () => {
                        state.isHeld = true;
                        syncPlayback();
                    };
                    const release = () => {
                        state.isHeld = false;
                        syncPlayback();
                    };

                    row.addEventListener('mouseenter', hold);
                    row.addEventListener('mouseleave', release);
                    row.addEventListener('focusin', hold);
                    row.addEventListener('focusout', release);

                    return {
                        state,
                        arrows: gsap.utils.toArray<HTMLElement>(
                            '[data-marquee-arrow]',
                            row,
                        ),
                        teardown: () => {
                            row.removeEventListener('mouseenter', hold);
                            row.removeEventListener('mouseleave', release);
                            row.removeEventListener('focusin', hold);
                            row.removeEventListener('focusout', release);
                        },
                    };
                });

                const timelines = loops.map(({ state }) => state.loop);
                const arrows = loops.flatMap((row) => row.arrows);

                // A leftward row points its arrows left (0°); a rightward one
                // turns them around.
                const pointArrows = (animate: boolean) => {
                    loops.forEach(({ arrows: rowArrows, state }) => {
                        const rotation = direction * state.sign > 0 ? 0 : 180;

                        if (animate) {
                            gsap.to(rowArrows, {
                                rotation,
                                duration: 0.4,
                                ease: 'power2.out',
                                overwrite: true,
                            });
                        } else {
                            gsap.set(rowArrows, { rotation });
                        }
                    });
                };

                const tweenSpeed = (multiplier: number, settling: boolean) => {
                    loops.forEach(({ state }) => {
                        gsap.to(state.loop, {
                            timeScale: direction * state.sign * multiplier,
                            duration: settling
                                ? SETTLE_SECONDS
                                : BOOST_IN_SECONDS,
                            ease: settling ? 'power1.out' : 'none',
                            overwrite: true,
                        });
                    });
                };

                pointArrows(false);

                // The wheel and scroll events both report every frame of a
                // scroll, so speed up once per gesture (or per change of
                // direction) and settle once it stops, instead of starting a
                // fresh tween on every event.
                let isBoosting = false;

                const observer = Observer.create({
                    target: window,
                    type: 'wheel,scroll',
                    tolerance: 10,
                    onStopDelay: BOOST_HOLD_SECONDS,
                    onChangeY: (self) => {
                        const scrolledDirection = self.deltaY < 0 ? -1 : 1;
                        const isNewDirection = scrolledDirection !== direction;

                        if (isNewDirection) {
                            direction = scrolledDirection;
                            pointArrows(true);
                        }

                        if (isNewDirection || !isBoosting) {
                            isBoosting = true;
                            tweenSpeed(SCROLL_BOOST, false);
                        }
                    },
                    onStop: () => {
                        isBoosting = false;
                        tweenSpeed(1, true);
                    },
                });

                // Off screen, nothing is worth animating: stop the loops and
                // stop listening to the page's scroll.
                syncPlayback = () => {
                    loops.forEach(({ state }) => {
                        state.loop.paused(!isOnScreen || state.isHeld);
                    });

                    if (isOnScreen) {
                        observer.enable();
                    } else {
                        observer.disable();
                    }
                };

                syncPlayback();

                return () => {
                    syncPlayback = () => {};
                    observer.kill();
                    loops.forEach(({ teardown }) => teardown());
                    // Tweens started from the observer's callbacks are not
                    // recorded by this context, so revert() alone would leave
                    // them running against the discarded loops.
                    gsap.killTweensOf([...timelines, ...arrows]);
                };
            }, root);
        };

        // Rebuild only when the width really changes; height changes (fonts,
        // images settling) do not move anything along the row.
        let lastWidth = root.offsetWidth;
        let resizeTimer: number | undefined;

        const resizeObserver = new ResizeObserver(() => {
            if (root.offsetWidth === lastWidth) {
                return;
            }

            lastWidth = root.offsetWidth;
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(build, 150);
        });

        resizeObserver.observe(root);

        const visibilityObserver = new IntersectionObserver(([entry]) => {
            isOnScreen = entry.isIntersecting;
            syncPlayback();
        });

        visibilityObserver.observe(root);
        reducedMotion.addEventListener('change', build);

        // Text widths are only final once the web font has loaded.
        let cancelled = false;
        document.fonts.ready.then(() => {
            if (!cancelled) {
                build();
            }
        });

        return () => {
            cancelled = true;
            window.clearTimeout(resizeTimer);
            resizeObserver.disconnect();
            visibilityObserver.disconnect();
            reducedMotion.removeEventListener('change', build);
            context?.revert();
        };
    }, [products]);

    return (
        <section
            ref={rootRef}
            aria-label="Browse products"
            className={cn(
                'flex flex-col gap-4 overflow-hidden py-10',
                className,
            )}
        >
            {rows.map((row, rowIndex) => {
                // The second row repeats the first in reverse, so it is
                // decoration for assistive tech and keyboard users.
                const isDecorative = rowIndex > 0;

                return (
                    <div
                        key={rowIndex}
                        data-marquee-row
                        data-marquee-sign={row.sign}
                        aria-hidden={isDecorative || undefined}
                        className={cn(
                            'relative flex w-max gap-4 px-4 motion-reduce:w-full motion-reduce:overflow-x-auto',
                            isDecorative && 'motion-reduce:hidden',
                        )}
                    >
                        {row.products.map((product, index) => {
                            const isCopy = index >= products.length;
                            const isHidden = isDecorative || isCopy;

                            return (
                                <Link
                                    key={`${product.id}-${index}`}
                                    data-marquee-item
                                    href={showProduct(product)}
                                    prefetch={LINK_PREFETCH}
                                    tabIndex={isHidden ? -1 : undefined}
                                    aria-hidden={
                                        isCopy && !isDecorative
                                            ? true
                                            : undefined
                                    }
                                    className={cn(
                                        'group flex shrink-0 items-center gap-4 rounded-full border border-border bg-card py-2 pr-3 pl-2 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                        isCopy && 'motion-reduce:hidden',
                                    )}
                                >
                                    <span className="relative size-12 shrink-0 md:size-14">
                                        <span className="block size-full overflow-hidden rounded-full bg-muted">
                                            {product.image && (
                                                <img
                                                    // The thumbnail is a few KB;
                                                    // the full upload is hundreds.
                                                    src={`/storage/${product.image_thumb ?? product.image}`}
                                                    alt=""
                                                    width={56}
                                                    height={56}
                                                    loading="lazy"
                                                    decoding="async"
                                                    fetchPriority="low"
                                                    className="size-full object-cover"
                                                />
                                            )}
                                        </span>
                                        {product.image && <MarqueeCrown />}
                                    </span>
                                    <span className="text-lg font-semibold whitespace-nowrap text-card-foreground md:text-2xl">
                                        {product.title}
                                    </span>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors duration-200 group-hover:bg-accent-hover">
                                        <ArrowLeft
                                            data-marquee-arrow
                                            className="size-4"
                                        />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                );
            })}
        </section>
    );
}
