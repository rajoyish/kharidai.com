import { gsap } from 'gsap';

export type HorizontalLoopConfig = {
    /** Roughly 100px per second at 1. */
    speed?: number;
    /** Space after the last item, so the seam matches the gap between items. */
    paddingRight?: number;
    repeat?: number;
    paused?: boolean;
    reversed?: boolean;
};

/**
 * A seamless horizontal loop of a flex row's items, after GSAP's
 * `horizontalLoop()` helper (gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop).
 *
 * Each item slides left until it clears the row, then jumps to the far end and
 * slides back to where it started, so the row never shows a gap. The returned
 * timeline plays either way: tween its `timeScale` negative to run it in reverse.
 * Measurements are taken once, so rebuild the loop when the row resizes.
 */
export function horizontalLoop(
    items: HTMLElement[],
    config: HorizontalLoopConfig = {},
): gsap.core.Timeline {
    const timeline: gsap.core.Timeline = gsap.timeline({
        repeat: config.repeat,
        paused: config.paused,
        defaults: { ease: 'none' },
        // Running backwards past the start would stop the loop, so jump far
        // ahead in total time instead; the visible position is unchanged.
        onReverseComplete: () => {
            timeline.totalTime(timeline.rawTime() + timeline.duration() * 100);
        },
    });

    const length = items.length;

    if (length === 0) {
        return timeline;
    }

    const startX = items[0].offsetLeft;
    const widths: number[] = [];
    const xPercents: number[] = [];
    const pixelsPerSecond = (config.speed ?? 1) * 100;
    const snap = gsap.utils.snap(1);

    // Express any existing x offset as xPercent, so the loop survives resizes
    // of the items themselves.
    gsap.set(items, {
        xPercent: (index: number, element: HTMLElement) => {
            const width = parseFloat(
                String(gsap.getProperty(element, 'width', 'px')),
            );
            widths[index] = width;
            xPercents[index] = snap(
                (parseFloat(String(gsap.getProperty(element, 'x', 'px'))) /
                    width) *
                    100 +
                    Number(gsap.getProperty(element, 'xPercent')),
            );

            return xPercents[index];
        },
    });
    gsap.set(items, { x: 0 });

    const last = items[length - 1];
    const totalWidth =
        last.offsetLeft +
        (xPercents[length - 1] / 100) * widths[length - 1] -
        startX +
        last.offsetWidth * Number(gsap.getProperty(last, 'scaleX')) +
        (config.paddingRight ?? 0);

    items.forEach((item, index) => {
        const currentX = (xPercents[index] / 100) * widths[index];
        const distanceToStart = item.offsetLeft + currentX - startX;
        const distanceToLoop =
            distanceToStart +
            widths[index] * Number(gsap.getProperty(item, 'scaleX'));

        timeline
            .to(
                item,
                {
                    xPercent: snap(
                        ((currentX - distanceToLoop) / widths[index]) * 100,
                    ),
                    duration: distanceToLoop / pixelsPerSecond,
                },
                0,
            )
            .fromTo(
                item,
                {
                    xPercent: snap(
                        ((currentX - distanceToLoop + totalWidth) /
                            widths[index]) *
                            100,
                    ),
                },
                {
                    xPercent: xPercents[index],
                    duration: (totalWidth - distanceToLoop) / pixelsPerSecond,
                    immediateRender: false,
                },
                distanceToLoop / pixelsPerSecond,
            );
    });

    // Pre-render every tween so the first frame is already in place.
    timeline.progress(1, true).progress(0, true);

    if (config.reversed) {
        timeline.vars.onReverseComplete?.();
        timeline.reverse();
    }

    return timeline;
}
