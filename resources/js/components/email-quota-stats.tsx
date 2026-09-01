import { Mail, ShieldAlert } from 'lucide-react';

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

const FALLBACK_ACCENT = { bar: 'bg-muted-foreground', dot: 'bg-muted-foreground' };

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
    const isLow = !isExhausted && stats.total_remaining <= stats.total_limit * 0.1;

    return (
        <section
            className={cn(
                'rounded-xl border bg-card p-5 text-card-foreground shadow-sm',
                className,
            )}
            aria-label={`Email sending quota for the last ${stats.window_hours} hours`}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-sm font-medium text-muted-foreground">
                            Emails sent in the last {stats.window_hours} hours
                        </h2>
                        <p className="text-2xl font-bold tabular-nums">
                            {stats.total_sent}
                            <span className="ml-1 text-base font-normal text-muted-foreground">
                                / {stats.total_limit}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                        Remaining today
                    </p>
                    <p
                        className={cn(
                            'text-2xl font-bold tabular-nums',
                            isExhausted && 'text-destructive',
                            isLow && 'text-warning',
                        )}
                    >
                        {stats.total_remaining}
                    </p>
                </div>
            </div>

            <div
                className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${usedPercent}% of the combined daily quota used`}
            >
                {stats.mailers.map((mailer) => (
                    <div
                        key={mailer.name}
                        className={cn(
                            'h-full transition-[width] duration-500',
                            (MAILER_ACCENTS[mailer.name] ?? FALLBACK_ACCENT).bar,
                        )}
                        style={{
                            width: `${percentage(mailer.sent, stats.total_limit)}%`,
                        }}
                    />
                ))}
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {stats.mailers.map((mailer) => (
                    <div key={mailer.name} className="rounded-lg border p-3">
                        <dt className="flex items-center gap-2 text-sm font-medium">
                            <span
                                className={cn(
                                    'size-2 rounded-full',
                                    (MAILER_ACCENTS[mailer.name] ?? FALLBACK_ACCENT)
                                        .dot,
                                )}
                            />
                            {mailer.label}
                        </dt>
                        <dd className="mt-1 flex items-baseline justify-between gap-2">
                            <span className="text-lg font-semibold tabular-nums">
                                {mailer.sent}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">
                                    / {mailer.limit}
                                </span>
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {mailer.remaining} left
                            </span>
                        </dd>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={cn(
                                    'h-full transition-[width] duration-500',
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
