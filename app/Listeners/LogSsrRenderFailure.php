<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Inertia\Ssr\SsrRenderFailed;
use Throwable;

/**
 * Inertia catches every SSR failure and quietly falls back to client-side
 * rendering, so a broken render costs the whole benefit of SSR while the site
 * still answers 200. On shared hosting there is no console to watch, so the
 * failure has to reach the log or nobody finds out.
 */
class LogSsrRenderFailure
{
    /**
     * How long a given failure stays quiet after being logged. SSR fails on
     * every page load once it breaks, and a log line per request would bury the
     * disk on a shared host.
     */
    private const THROTTLE_SECONDS = 300;

    public function handle(SsrRenderFailed $event): void
    {
        if (! $this->shouldLog($event)) {
            return;
        }

        Log::warning('Inertia SSR render failed; the page fell back to client-side rendering.', $event->toArray());
    }

    /**
     * Report each distinct failure at most once per throttle window. A cache
     * that is itself unavailable must not take the page down with it, so a
     * failing store means the event is logged rather than swallowed.
     */
    private function shouldLog(SsrRenderFailed $event): bool
    {
        try {
            return Cache::add(
                'ssr-render-failed:'.$event->type->value.':'.$event->component(),
                true,
                self::THROTTLE_SECONDS,
            );
        } catch (Throwable) {
            return true;
        }
    }
}
