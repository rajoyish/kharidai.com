import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How far one arrow press travels, as a fraction of the visible track. */
const SCROLL_STEP_RATIO = 0.75;

/** Sub-pixel slack, so a track scrolled to its end doesn't keep an arrow lit. */
const EDGE_TOLERANCE = 2;

/**
 * A horizontal track that keeps overflowing nav items reachable instead of
 * letting them wrap and blow out the header's height.
 *
 * The track scrolls by touch or trackpad on its own; the arrows exist for mouse
 * users, who have no equivalent gesture. Each edge shows an arrow and a fade
 * only while there is more content that way, so a menu that already fits looks
 * like a plain row.
 *
 * Children that open a popover must portal it (`DropdownMenu` does) — the
 * overflow that makes this scroll would otherwise clip the panel.
 */
export function NavScroller({ children }: PropsWithChildren) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const syncEdges = useCallback(() => {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        const maxScroll = track.scrollWidth - track.clientWidth;

        setCanScrollLeft(track.scrollLeft > EDGE_TOLERANCE);
        setCanScrollRight(track.scrollLeft < maxScroll - EDGE_TOLERANCE);
    }, []);

    // The arrows are measured, never guessed, so they stay correct as the menu
    // changes, the window resizes, or a font loads late and reflows the row.
    useEffect(() => {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        syncEdges();

        const observer = new ResizeObserver(syncEdges);
        observer.observe(track);

        for (const child of Array.from(track.children)) {
            observer.observe(child);
        }

        return () => observer.disconnect();
    }, [syncEdges, children]);

    const scrollBy = (direction: -1 | 1) => {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        track.scrollBy({
            left: direction * track.clientWidth * SCROLL_STEP_RATIO,
            behavior: 'smooth',
        });
    };

    return (
        <div className="relative min-w-0 flex-1">
            {canScrollLeft && (
                <>
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent"
                    />
                    <button
                        type="button"
                        onClick={() => scrollBy(-1)}
                        aria-label="Scroll navigation left"
                        className="absolute top-1/2 left-0 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-primary"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                </>
            )}

            <div
                ref={trackRef}
                onScroll={syncEdges}
                data-slot="nav-scroller-track"
                className="scrollbar-none flex items-center gap-1 overflow-x-auto scroll-smooth"
            >
                {children}
            </div>

            {canScrollRight && (
                <>
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
                    />
                    <button
                        type="button"
                        onClick={() => scrollBy(1)}
                        aria-label="Scroll navigation right"
                        className="absolute top-1/2 right-0 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-primary"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </>
            )}
        </div>
    );
}
