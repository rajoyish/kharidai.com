import { Clock, Gauge, Mail, ShieldAlert, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

export type EmailQuotaSummary = {
    window_hours: number;
    total_limit: number;
    total_sent: number;
    total_remaining: number;
    other_sent: number;
    mailers: {
        name: string;
        label: string;
        sent: number;
        limit: number;
        remaining: number;
    }[];
};

/**
 * Per-provider accents. Tailwind only ships class names it can see in the
 * source, so these are spelled out rather than built from the mailer name.
 */
const MAILER_ACCENTS: Record<string, { bar: string; dot: string }> = {
    brevo: { bar: 'bg-chart-2', dot: 'bg-chart-2' },
    gmail: { bar: 'bg-chart-4', dot: 'bg-chart-4' },
};

const FALLBACK_ACCENT = {
    bar: 'bg-muted-foreground',
    dot: 'bg-muted-foreground',
};

function percentage(value: number, total: number) {
    if (total <= 0) {
        return 0;
    }

    return Math.min(100, Math.round((value / total) * 100));
}

/**
 * What is left of the day's free-tier email allowance.
 *
 * The numbers cover every email the app sent, not just newsletters: order
 * confirmations spend the same allowance, so a widget that only counted mass
 * mail would promise headroom the providers will not honour.
 *
 * Built around the meter rather than around a pair of big numbers, because the
 * question an admin brings to this card is "will the send I am about to queue
 * fit", not "how many went out". The headline is therefore what is left, and
 * everything else annotates it.
 */
export function EmailQuotaStats({
    stats,
    className,
}: {
    stats: EmailQuotaSummary;
    className?: string;
}) {
    const usedPercent = percentage(stats.total_sent, stats.total_limit);
    const isExhausted = stats.total_remaining === 0;
    const isLow =
        !isExhausted && stats.total_remaining <= stats.total_limit * 0.1;

    const HeadlineIcon = isExhausted
        ? ShieldAlert
        : isLow
          ? TriangleAlert
          : Gauge;

    return (
        <section
            className={cn(
                // A container, not a viewport, decides this card's layout: it
                // renders both full width on the index and inside the composer's
                // 22rem sidebar, where a `sm:` two-column split lands mid-phrase.
                '@container rounded-xl border bg-card p-5 text-card-foreground shadow-sm',
                className,
            )}
            aria-label={`Email sending quota for the last ${stats.window_hours} hours`}
        >
            <div className="flex flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between @sm:gap-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="size-5" />
                    </span>
                    <div className="grid gap-0.5">
                        <h2 className="text-sm font-semibold">Email quota</h2>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3.5 shrink-0" />
                            <span className="tabular-nums">
                                {stats.total_sent} sent in the last{' '}
                                {stats.window_hours} hours
                            </span>
                        </p>
                    </div>
                </div>

                <div className="grid gap-0.5 @sm:text-right">
                    <p
                        className={cn(
                            'flex items-center gap-2 text-3xl leading-none font-bold tabular-nums @sm:justify-end',
                            isExhausted && 'text-destructive',
                            isLow && 'text-warning',
                        )}
                    >
                        <HeadlineIcon className="size-5 shrink-0" />
                        {stats.total_remaining}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                        remaining of {stats.total_limit}
                    </p>
                </div>
            </div>

            {/*
                The combined meter. Segments are separated by a hairline gap so two
                providers reading as one fill is never mistaken for a single
                provider carrying the whole day.
            */}
            <div
                className="mt-5 flex h-3 w-full gap-px overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${usedPercent}% of the combined daily quota used`}
            >
                {stats.mailers.map((mailer) => (
                    <div
                        key={mailer.name}
                        className={cn(
                            'h-full transition-[width] duration-500 ease-out',
                            (MAILER_ACCENTS[mailer.name] ?? FALLBACK_ACCENT)
                                .bar,
                        )}
                        style={{
                            width: `${percentage(mailer.sent, stats.total_limit)}%`,
                        }}
                    />
                ))}
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-3 @md:grid-cols-2">
                {stats.mailers.map((mailer) => (
                    <div key={mailer.name} className="grid gap-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                            <dt className="flex items-center gap-2 text-sm font-medium">
                                <span
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        (
                                            MAILER_ACCENTS[mailer.name] ??
                                            FALLBACK_ACCENT
                                        ).dot,
                                    )}
                                />
                                {mailer.label}
                            </dt>
                            <dd className="text-xs text-muted-foreground tabular-nums">
                                {mailer.remaining} of {mailer.limit} left
                            </dd>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={cn(
                                    'h-full transition-[width] duration-500 ease-out',
                                    (
                                        MAILER_ACCENTS[mailer.name] ??
                                        FALLBACK_ACCENT
                                    ).bar,
                                )}
                                style={{
                                    width: `${percentage(mailer.sent, mailer.limit)}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </dl>

            {stats.other_sent > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                    {stats.other_sent} more went out on a transport with no
                    configured limit, so they are not counted above.
                </p>
            )}

            {isLow && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>
                        Under a tenth of the day's allowance is left. A large
                        send will pause partway and finish once the window rolls
                        over.
                    </span>
                </p>
            )}

            {isExhausted && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    <span>
                        The quota is spent. Sending is paused for every email,
                        including order confirmations, until the window rolls
                        over.
                    </span>
                </p>
            )}
        </section>
    );
}
