<?php

namespace App\Services\Mail;

use App\Models\EmailDispatch;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * The rolling 24-hour ledger the free-tier send limits are enforced against.
 *
 * Every outgoing message is counted, not just newsletters: Brevo's 300 a day is
 * spent by order confirmations exactly as fast as by a mass mail, so a counter
 * that only knew about newsletters would authorise sends the provider rejects.
 *
 * Backed by a table rather than a cache counter. The count has to survive a cache
 * flush and a deploy — losing it silently re-arms 800 sends against a provider
 * that has already had them — and the per-mailer breakdown the admin screen shows
 * falls out of the same rows for free.
 */
class EmailQuotaTracker
{
    /**
     * Record one delivery attempt that reached a transport.
     *
     * Never throws: this runs inside the send path, and a bookkeeping failure must
     * not turn a delivered email into an exception the caller has to handle.
     */
    public function record(string $mailer, string $recipient, ?CarbonInterface $sentAt = null): void
    {
        try {
            EmailDispatch::create([
                'mailer' => Str::limit($mailer, 64, ''),
                'recipient' => Str::limit($recipient, 255, ''),
                'sent_at' => $sentAt ?? now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Failed to record an email dispatch against the send quota.', [
                'mailer' => $mailer,
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    public function windowStart(): CarbonInterface
    {
        return now()->subHours($this->windowHours());
    }

    public function windowHours(): int
    {
        return max(1, (int) config('mail.quota.window_hours', 24));
    }

    /**
     * How many emails went out in the window, optionally on one mailer.
     */
    public function sentInWindow(?string $mailer = null): int
    {
        return EmailDispatch::query()
            ->sentSince($this->windowStart())
            ->when($mailer, fn ($query) => $query->where('mailer', $mailer))
            ->count();
    }

    /**
     * Sends in the window grouped by mailer.
     *
     * @return array<string, int>
     */
    public function usageByMailer(): array
    {
        return EmailDispatch::query()
            ->sentSince($this->windowStart())
            ->selectRaw('mailer, count(*) as aggregate')
            ->groupBy('mailer')
            ->pluck('aggregate', 'mailer')
            ->map(fn ($count): int => (int) $count)
            ->all();
    }

    /**
     * The configured daily ceilings, keyed by mailer name and in priority order.
     *
     * @return array<string, int>
     */
    public function limits(): array
    {
        /** @var array<string, int|string> $limits */
        $limits = config('mail.quota.mailers', []);

        return array_map(static fn ($limit): int => max(0, (int) $limit), $limits);
    }

    public function limitFor(string $mailer): int
    {
        return $this->limits()[$mailer] ?? 0;
    }

    public function remainingFor(string $mailer): int
    {
        return max(0, $this->limitFor($mailer) - $this->sentInWindow($mailer));
    }

    public function totalLimit(): int
    {
        return array_sum($this->limits());
    }

    /**
     * Headroom left across every capped mailer.
     *
     * Derived per mailer rather than as "total limit minus total sent", so mail on
     * an uncapped transport — the `log` mailer locally, `array` in tests — cannot
     * eat an allowance it never spent.
     */
    public function remainingTotal(): int
    {
        $usage = $this->usageByMailer();

        $remaining = 0;

        foreach ($this->limits() as $mailer => $limit) {
            $remaining += max(0, $limit - ($usage[$mailer] ?? 0));
        }

        return $remaining;
    }

    /**
     * The circuit breaker's question: is there room for one more email anywhere?
     */
    public function hasCapacity(): bool
    {
        return $this->remainingTotal() > 0;
    }

    /**
     * Seconds until the window releases capacity, for a job to sleep on.
     *
     * The oldest send inside the window is the next one to age out, so that is
     * when the count can drop. Floored at a minute so an exhausted queue cannot
     * spin, and capped at the window so a clock skew cannot park a job for days.
     */
    public function secondsUntilCapacity(): int
    {
        $oldest = EmailDispatch::query()
            ->sentSince($this->windowStart())
            ->min('sent_at');

        if ($oldest === null) {
            return 60;
        }

        $freesAt = Date::parse($oldest)->addHours($this->windowHours());

        return (int) min(
            $this->windowHours() * 3600,
            max(60, now()->diffInSeconds($freesAt, absolute: false)),
        );
    }

    /**
     * The shape the admin screen renders.
     *
     * @return array{
     *     window_hours: int,
     *     total_limit: int,
     *     total_sent: int,
     *     total_remaining: int,
     *     other_sent: int,
     *     mailers: list<array{name: string, label: string, sent: int, limit: int, remaining: int}>
     * }
     */
    public function stats(): array
    {
        $usage = $this->usageByMailer();
        $limits = $this->limits();

        $mailers = [];

        foreach ($limits as $name => $limit) {
            $sent = $usage[$name] ?? 0;

            $mailers[] = [
                'name' => $name,
                'label' => Str::headline($name),
                'sent' => $sent,
                'limit' => $limit,
                'remaining' => max(0, $limit - $sent),
            ];
        }

        $cappedSent = array_sum(array_map(
            static fn (array $mailer): int => $mailer['sent'],
            $mailers,
        ));

        return [
            'window_hours' => $this->windowHours(),
            'total_limit' => array_sum($limits),
            'total_sent' => $cappedSent,
            'total_remaining' => $this->remainingTotal(),

            /*
             * Mail sent on a transport with no configured ceiling — `log` on a dev
             * machine, `array` under test. Surfaced rather than hidden so a number
             * that does not add up on the dashboard has a visible explanation.
             */
            'other_sent' => max(0, array_sum($usage) - $cappedSent),
            'mailers' => $mailers,
        ];
    }

    /**
     * Drop rows that have aged past the retention window.
     */
    public function prune(): int
    {
        $retentionDays = max(1, (int) config('mail.quota.retention_days', 7));

        return EmailDispatch::query()
            ->where('sent_at', '<', now()->subDays($retentionDays))
            ->delete();
    }
}
