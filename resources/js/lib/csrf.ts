import { http } from '@inertiajs/react';

/**
 * Keeps CSRF working for visitors who arrived on an edge-cached page.
 *
 * A cached page is served with its Set-Cookie stripped, so the first visitor of
 * a session holds no `XSRF-TOKEN` and Inertia has nothing to put in the
 * `X-XSRF-TOKEN` header. Laravel would answer their first write with a 419.
 *
 * Before any request that is not a read, this fetches a token if one is missing
 * and sets the header from the cookie itself, rather than trusting that the
 * client re-reads `document.cookie` after the interceptor has run.
 */

const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'X-XSRF-TOKEN';
const PRIMING_URL = '/csrf-cookie';

const READ_METHODS = ['get', 'head', 'options'];

function readToken(): string | null {
    const match = document.cookie.match(
        new RegExp(`(^|;\\s*)${COOKIE_NAME}=([^;]*)`),
    );

    return match ? decodeURIComponent(match[2]) : null;
}

/**
 * One in-flight priming request at most. A page that fires several writes at
 * once must not open several sessions and race over which cookie survives.
 */
let priming: Promise<void> | null = null;

function primeToken(): Promise<void> {
    priming ??= fetch(PRIMING_URL, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => {
            priming = null;
        });

    return priming;
}

export function registerCsrfPriming(): void {
    http.onRequest(async (config) => {
        const method = (config.method ?? 'get').toLowerCase();

        if (READ_METHODS.includes(method)) {
            return config;
        }

        let token = readToken();

        if (!token) {
            await primeToken();
            token = readToken();
        }

        if (token) {
            config.headers = { ...config.headers, [HEADER_NAME]: token };
        }

        return config;
    });
}
