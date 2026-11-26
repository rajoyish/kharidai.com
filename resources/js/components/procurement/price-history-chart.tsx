import { useEffect, useMemo, useRef, useState } from 'react';
import { formatNpr } from '@/lib/currency';
import { SHOP_TIME_ZONE } from '@/lib/dates';

export type PricePoint = {
    /** ISO timestamp or Y-m-d date. */
    at: string;
    price: number;
    cost: number | null;
};

export type PurchasePoint = {
    at: string;
    unitCost: number;
    quantity: number;
};

type Props = {
    prices: PricePoint[];
    purchases: PurchasePoint[];
};

const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 64 };

const dateLabel = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: SHOP_TIME_ZONE,
});
const fullDateLabel = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SHOP_TIME_ZONE,
});

/**
 * Selling price and unit cost over time, drawn as step lines because a price
 * holds until the next change, with actual purchases as dots so the cost the
 * wallet really paid can be read against the cost the price was set on.
 *
 * Both measures are NPR, so they share one axis.
 */
export function PriceHistoryChart({ prices, purchases }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(640);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    useEffect(() => {
        const element = containerRef.current;

        if (!element) {
            return;
        }

        const observer = new ResizeObserver(([entry]) =>
            setWidth(Math.max(280, entry.contentRect.width)),
        );
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const chart = useMemo(() => {
        const sorted = [...prices].sort(
            (a, b) => Date.parse(a.at) - Date.parse(b.at),
        );
        const purchaseDots = purchases.map((purchase) => ({
            ...purchase,
            time: Date.parse(purchase.at),
        }));
        const times = [
            ...sorted.map((point) => Date.parse(point.at)),
            ...purchaseDots.map((dot) => dot.time),
        ];

        if (times.length === 0) {
            return null;
        }

        // The right edge is the latest recorded event rather than the clock,
        // so the server-rendered markup and the hydrated chart agree.
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const values = [
            ...sorted.flatMap((point) =>
                point.cost === null ? [point.price] : [point.price, point.cost],
            ),
            ...purchaseDots.map((dot) => dot.unitCost),
        ];
        const maxValue = Math.max(...values, 1) * 1.1;

        const plotWidth = width - PADDING.left - PADDING.right;
        const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
        const span = Math.max(maxTime - minTime, 1);

        const x = (time: number) =>
            PADDING.left + ((time - minTime) / span) * plotWidth;
        const y = (value: number) =>
            PADDING.top + plotHeight - (value / maxValue) * plotHeight;

        const stepPath = (key: 'price' | 'cost') => {
            const segments: string[] = [];
            let previous: number | null = null;

            sorted.forEach((point, index) => {
                const value = point[key];
                const px = x(Date.parse(point.at));

                if (value === null) {
                    previous = null;

                    return;
                }

                segments.push(
                    previous === null
                        ? `M${px},${y(value)}`
                        : `H${px}V${y(value)}`,
                );
                previous = value;

                if (index === sorted.length - 1) {
                    segments.push(`H${PADDING.left + plotWidth}`);
                }
            });

            return segments.join('');
        };

        const ticks = Array.from({ length: 5 }, (_, index) =>
            Math.round((maxValue / 4) * index),
        );
        const timeTickCount = Math.min(
            5,
            Math.max(2, Math.floor(plotWidth / 120)),
        );
        const timeTicks = Array.from(
            { length: timeTickCount },
            (_, index) => minTime + (span / (timeTickCount - 1)) * index,
        );

        return {
            sorted,
            purchaseDots,
            x,
            y,
            ticks,
            timeTicks,
            pricePath: stepPath('price'),
            costPath: stepPath('cost'),
            plotWidth,
        };
    }, [prices, purchases, width]);

    if (!chart) {
        return (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No price changes yet.
            </div>
        );
    }

    const hovered = hoverIndex === null ? null : chart.sorted[hoverIndex];

    const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left;
        let nearest: number | null = null;

        chart.sorted.forEach((point, index) => {
            if (chart.x(Date.parse(point.at)) <= pointerX) {
                nearest = index;
            }
        });

        setHoverIndex(nearest);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-chart-1" />
                    Selling price
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-0 w-4 border-t-2 border-dashed border-chart-3" />
                    Our cost
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border-2 border-background bg-chart-3 ring-1 ring-chart-3" />
                    Purchase
                </span>
            </div>

            <svg
                width={width}
                height={HEIGHT}
                role="img"
                aria-label="Selling price and unit cost over time"
                className="block touch-none select-none"
                onPointerMove={handlePointerMove}
                onPointerLeave={() => setHoverIndex(null)}
            >
                {chart.ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={PADDING.left}
                            x2={PADDING.left + chart.plotWidth}
                            y1={chart.y(tick)}
                            y2={chart.y(tick)}
                            className="stroke-border"
                            strokeWidth={1}
                        />
                        <text
                            x={PADDING.left - 8}
                            y={chart.y(tick)}
                            dy="0.32em"
                            textAnchor="end"
                            className="fill-muted-foreground text-[11px] tabular-nums"
                        >
                            {formatNpr(tick)}
                        </text>
                    </g>
                ))}

                {chart.timeTicks.map((time) => (
                    <text
                        key={time}
                        x={chart.x(time)}
                        y={HEIGHT - 8}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[11px]"
                    >
                        {dateLabel.format(time)}
                    </text>
                ))}

                <path
                    d={chart.costPath}
                    fill="none"
                    className="stroke-chart-3"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeLinejoin="round"
                />
                <path
                    d={chart.pricePath}
                    fill="none"
                    className="stroke-chart-1"
                    strokeWidth={2}
                    strokeLinejoin="round"
                />

                {chart.purchaseDots.map((dot, index) => (
                    <circle
                        key={`${dot.at}-${index}`}
                        cx={chart.x(dot.time)}
                        cy={chart.y(dot.unitCost)}
                        r={4.5}
                        className="fill-chart-3 stroke-background"
                        strokeWidth={2}
                    >
                        <title>
                            {`${fullDateLabel.format(dot.time)}: bought ${dot.quantity} at ${formatNpr(dot.unitCost)} each`}
                        </title>
                    </circle>
                ))}

                {hovered && (
                    <g pointerEvents="none">
                        <line
                            x1={chart.x(Date.parse(hovered.at))}
                            x2={chart.x(Date.parse(hovered.at))}
                            y1={PADDING.top}
                            y2={HEIGHT - PADDING.bottom}
                            className="stroke-muted-foreground"
                            strokeWidth={1}
                        />
                        <circle
                            cx={chart.x(Date.parse(hovered.at))}
                            cy={chart.y(hovered.price)}
                            r={4}
                            className="fill-chart-1 stroke-background"
                            strokeWidth={2}
                        />
                    </g>
                )}
            </svg>

            {hovered && (
                <div
                    className="pointer-events-none absolute top-10 z-10 min-w-44 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
                    style={{
                        left: Math.min(
                            chart.x(Date.parse(hovered.at)) + 12,
                            width - 190,
                        ),
                    }}
                >
                    <div className="mb-1 font-medium">
                        {fullDateLabel.format(Date.parse(hovered.at))}
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Price</span>
                        <span className="tabular-nums">
                            {formatNpr(hovered.price)}
                        </span>
                    </div>
                    {hovered.cost !== null && (
                        <>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Cost
                                </span>
                                <span className="tabular-nums">
                                    {formatNpr(hovered.cost)}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Profit
                                </span>
                                <span className="tabular-nums">
                                    {formatNpr(hovered.price - hovered.cost)}
                                    {hovered.price > 0 &&
                                        ` (${(((hovered.price - hovered.cost) / hovered.price) * 100).toFixed(1)}%)`}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
