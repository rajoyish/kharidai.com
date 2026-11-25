import { Link } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { show as showSupplier } from '@/actions/App/Http/Controllers/Admin/SupplierController';
import { Stat } from '@/components/procurement/stat';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatNpr } from '@/lib/currency';
import { cn } from '@/lib/utils';

export type SupplierSpend = {
    id: number;
    name: string;
    topped_up_npr: number;
    store_npr: number;
    personal_npr: number;
    remaining_npr: number;
    top_up_count: number;
    purchase_count: number;
    personal_count: number;
};

export type MonthSpend = {
    month: string;
    topped_up_npr: number;
    store_npr: number;
    personal_npr: number;
};

export type WalletSpend = {
    totals: {
        topped_up_npr: number;
        store_npr: number;
        personal_npr: number;
        remaining_npr: number;
        top_up_count: number;
        purchase_count: number;
        personal_count: number;
    };
    suppliers: SupplierSpend[];
    months: MonthSpend[];
};

/**
 * One colour per kind of money, the same in every chart. Validated as a
 * categorical set (lightness band, colour-blind separation, contrast) on the
 * card surface in each theme; dark mode uses its own steps, not a flip.
 * Unspent money is a remainder, so it stays neutral.
 */
const SERIES = {
    toppedUp: {
        label: 'Topped up',
        bg: 'bg-[#62911b] dark:bg-[#7db137]',
        fill: 'fill-[#62911b] dark:fill-[#7db137]',
    },
    store: {
        label: 'Spent for store',
        bg: 'bg-[#1176bc] dark:bg-[#469fe8]',
        fill: 'fill-[#1176bc] dark:fill-[#469fe8]',
    },
    personal: {
        label: 'Spent personally',
        bg: 'bg-[#a96b00] dark:bg-[#ca8a10]',
        fill: 'fill-[#a96b00] dark:fill-[#ca8a10]',
    },
    remaining: {
        label: 'Still in wallet',
        bg: 'bg-muted-foreground/25',
        fill: 'fill-muted-foreground/25',
    },
} as const;

type SeriesKey = keyof typeof SERIES;

const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'short' });
const fullMonthLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
});

/** "2026-11" as a local date, so the label never slips a month by timezone. */
const monthDate = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Date(year, monthNumber - 1, 1);
};

const percentOf = (part: number, whole: number) =>
    whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';

function Legend({ keys }: { keys: SeriesKey[] }) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {keys.map((key) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                    <span
                        className={cn('size-2.5 rounded-sm', SERIES[key].bg)}
                    />
                    {SERIES[key].label}
                </span>
            ))}
        </div>
    );
}

/**
 * Totals across every supplier wallet, where each supplier's money went, and
 * money in against money out month by month.
 */
export function WalletSpendOverview({ spend }: { spend: WalletSpend }) {
    const { totals } = spend;
    const spent = totals.store_npr + totals.personal_npr;

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                    label="Available balance"
                    value={formatNpr(totals.remaining_npr)}
                    hint={`${percentOf(totals.remaining_npr, totals.topped_up_npr)} of top-ups unspent`}
                />
                <Stat
                    label="Total topped up"
                    value={formatNpr(totals.topped_up_npr)}
                    hint={`${totals.top_up_count} top-ups`}
                />
                <Stat
                    label="Spent for store"
                    value={formatNpr(totals.store_npr)}
                    hint={`${totals.purchase_count} purchases`}
                />
                <Stat
                    label="Spent personally"
                    value={formatNpr(totals.personal_npr)}
                    hint={`${totals.personal_count} purchases · ${percentOf(totals.personal_npr, spent)} of spend`}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-5">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>By supplier</CardTitle>
                        <CardDescription>
                            Each bar is what you topped up, split by where it
                            went.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Legend keys={['store', 'personal', 'remaining']} />
                        <SupplierBars suppliers={spend.suppliers} />
                    </CardContent>
                </Card>

                <Card className="xl:col-span-3">
                    <CardHeader>
                        <CardTitle>Last 12 months</CardTitle>
                        <CardDescription>
                            Money into wallets against money spent from them.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Legend keys={['toppedUp', 'store', 'personal']} />
                        <MonthlyChart months={spend.months} />
                        <details className="text-sm">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                Show as table
                            </summary>
                            <MonthlyTable months={spend.months} />
                        </details>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * One row per supplier. Bars share one scale, so a longer bar is a wallet
 * that has taken more money, and the segments show where it went.
 */
function SupplierBars({ suppliers }: { suppliers: SupplierSpend[] }) {
    if (suppliers.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No top-ups yet.
            </div>
        );
    }

    const largest = Math.max(...suppliers.map((row) => row.topped_up_npr), 1);

    return (
        <ul className="grid gap-4">
            {suppliers.map((supplier) => {
                const segments = (
                    [
                        ['store', supplier.store_npr],
                        ['personal', supplier.personal_npr],
                        ['remaining', supplier.remaining_npr],
                    ] as const
                ).filter(([, amount]) => amount > 0);

                return (
                    <li key={supplier.id} className="grid gap-1.5">
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                            <Link
                                href={showSupplier.url(supplier.id)}
                                className="truncate font-medium hover:underline"
                            >
                                {supplier.name}
                            </Link>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatNpr(supplier.remaining_npr)} left of{' '}
                                {formatNpr(supplier.topped_up_npr)}
                            </span>
                        </div>
                        <div
                            className="flex h-3 gap-0.5"
                            style={{
                                width: `${Math.max((supplier.topped_up_npr / largest) * 100, 2)}%`,
                            }}
                        >
                            {segments.map(([key, amount]) => (
                                <Tooltip key={key}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                'h-full min-w-1 first:rounded-l last:rounded-r',
                                                SERIES[key].bg,
                                            )}
                                            style={{ flexGrow: amount }}
                                            aria-label={`${SERIES[key].label}: ${formatNpr(amount)}`}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span className="font-medium">
                                            {SERIES[key].label}
                                        </span>{' '}
                                        <span className="tabular-nums">
                                            {formatNpr(amount)} (
                                            {percentOf(
                                                amount,
                                                supplier.topped_up_npr,
                                            )}
                                            )
                                        </span>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

const HEIGHT = 240;
const PADDING = { top: 12, right: 8, bottom: 28, left: 72 };

/**
 * Two bars a month on one rupee axis: money topped up, and money spent with
 * store and personal spending stacked. Hovering a month shows its numbers.
 */
function MonthlyChart({ months }: { months: MonthSpend[] }) {
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
        const peak = Math.max(
            ...months.map((month) =>
                Math.max(
                    month.topped_up_npr,
                    month.store_npr + month.personal_npr,
                ),
            ),
        );

        if (peak <= 0) {
            return null;
        }

        const maxValue = niceCeiling(peak);
        const plotWidth = width - PADDING.left - PADDING.right;
        const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
        const band = plotWidth / months.length;
        const barWidth = Math.max(3, Math.min(18, (band - 10) / 2));
        const baseline = PADDING.top + plotHeight;
        const height = (value: number) => (value / maxValue) * plotHeight;

        return {
            band,
            barWidth,
            baseline,
            height,
            plotWidth,
            ticks: Array.from({ length: 5 }, (_, i) => (maxValue / 4) * i),
            y: (value: number) => baseline - height(value),
            labelEvery: band < 40 ? 2 : 1,
        };
    }, [months, width]);

    if (!chart) {
        return (
            <div
                ref={containerRef}
                className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
            >
                No top-ups or purchases in the last 12 months.
            </div>
        );
    }

    const hovered = hoverIndex === null ? null : months[hoverIndex];
    const bandStart = (index: number) => PADDING.left + chart.band * index;

    return (
        <div ref={containerRef} className="relative w-full">
            <svg
                width={width}
                height={HEIGHT}
                role="img"
                aria-label="Money topped up and spent per month, last 12 months"
                className="block touch-none select-none"
                onPointerLeave={() => setHoverIndex(null)}
            >
                {chart.ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={PADDING.left}
                            x2={PADDING.left + chart.plotWidth}
                            y1={chart.y(tick)}
                            y2={chart.y(tick)}
                            className={
                                tick === 0
                                    ? 'stroke-border-strong'
                                    : 'stroke-border'
                            }
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

                {months.map((month, index) => {
                    const center = bandStart(index) + chart.band / 2;
                    const inX = center - chart.barWidth - 1;
                    const outX = center + 1;
                    const storeHeight = chart.height(month.store_npr);
                    const personalHeight = chart.height(month.personal_npr);
                    const isHovered = hoverIndex === index;

                    return (
                        <g
                            key={month.month}
                            onPointerEnter={() => setHoverIndex(index)}
                        >
                            {/* The hit target is the whole month band, not just the bars. */}
                            <rect
                                x={bandStart(index)}
                                y={PADDING.top}
                                width={chart.band}
                                height={HEIGHT - PADDING.top - PADDING.bottom}
                                className={
                                    isHovered
                                        ? 'fill-muted'
                                        : 'fill-transparent'
                                }
                            />
                            <Bar
                                x={inX}
                                width={chart.barWidth}
                                bottom={chart.baseline}
                                height={chart.height(month.topped_up_npr)}
                                className={SERIES.toppedUp.fill}
                                roundTop
                            />
                            <Bar
                                x={outX}
                                width={chart.barWidth}
                                bottom={chart.baseline}
                                height={storeHeight}
                                className={SERIES.store.fill}
                                roundTop={personalHeight === 0}
                            />
                            <Bar
                                x={outX}
                                width={chart.barWidth}
                                // A 2px surface gap separates the stacked segments.
                                bottom={
                                    chart.baseline -
                                    storeHeight -
                                    (storeHeight > 0 ? 2 : 0)
                                }
                                height={personalHeight}
                                className={SERIES.personal.fill}
                                roundTop
                            />
                            {index % chart.labelEvery === 0 && (
                                <text
                                    x={center}
                                    y={HEIGHT - 8}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[11px]"
                                >
                                    {monthLabel.format(monthDate(month.month))}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {hovered && hoverIndex !== null && (
                <div
                    className="pointer-events-none absolute top-2 z-10 min-w-52 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
                    style={{
                        left: Math.max(
                            0,
                            Math.min(
                                bandStart(hoverIndex) + chart.band + 8,
                                width - 216,
                            ),
                        ),
                    }}
                >
                    <div className="mb-1 font-medium">
                        {fullMonthLabel.format(monthDate(hovered.month))}
                    </div>
                    {(
                        [
                            ['toppedUp', hovered.topped_up_npr],
                            ['store', hovered.store_npr],
                            ['personal', hovered.personal_npr],
                        ] as const
                    ).map(([key, amount]) => (
                        <div
                            key={key}
                            className="flex items-center justify-between gap-4"
                        >
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <span
                                    className={cn(
                                        'size-2 rounded-sm',
                                        SERIES[key].bg,
                                    )}
                                />
                                {SERIES[key].label}
                            </span>
                            <span className="tabular-nums">
                                {formatNpr(amount)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** A bar anchored to its baseline, with 4px rounding on the data end only. */
function Bar({
    x,
    width,
    bottom,
    height,
    className,
    roundTop,
}: {
    x: number;
    width: number;
    bottom: number;
    height: number;
    className: string;
    roundTop: boolean;
}) {
    if (height <= 0) {
        return null;
    }

    const radius = roundTop ? Math.min(4, width / 2, height) : 0;
    const top = bottom - height;

    return (
        <path
            className={className}
            d={`M${x},${bottom}V${top + radius}Q${x},${top} ${x + radius},${top}H${x + width - radius}Q${x + width},${top} ${x + width},${top + radius}V${bottom}Z`}
        />
    );
}

/** Round an axis maximum up to 1, 2, 2.5 or 5 times a power of ten. */
function niceCeiling(value: number): number {
    const magnitude = 10 ** Math.floor(Math.log10(value));

    for (const step of [1, 2, 2.5, 5, 10]) {
        if (value <= step * magnitude) {
            return step * magnitude;
        }
    }

    return 10 * magnitude;
}

function MonthlyTable({ months }: { months: MonthSpend[] }) {
    return (
        <Table className="mt-2">
            <TableHeader>
                <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Topped up</TableHead>
                    <TableHead className="text-right">For store</TableHead>
                    <TableHead className="text-right">Personal</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {[...months].reverse().map((month) => (
                    <TableRow key={month.month}>
                        <TableCell>
                            {fullMonthLabel.format(monthDate(month.month))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatNpr(month.topped_up_npr)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatNpr(month.store_npr)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {formatNpr(month.personal_npr)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
