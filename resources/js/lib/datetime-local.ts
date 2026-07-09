/**
 * Helpers for `<input type="datetime-local">`, which reads and writes local
 * wall-clock time with no timezone offset.
 *
 * The server stores instants in UTC, so the raw input value must never be sent
 * as-is: an editor in UTC+05:45 picking "18:15" means 12:30 UTC, and posting
 * "18:15" would schedule the content nearly six hours into the future.
 *
 * Written without JSX so the Playwright unit tests can import it directly.
 */

const pad = (value: number): string => String(value).padStart(2, '0');

/** Renders an ISO-8601 instant as a `datetime-local` value in the viewer's timezone. */
export function isoToDateTimeLocal(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/** Converts a `datetime-local` value (local wall time) into an ISO-8601 UTC instant. */
export function dateTimeLocalToIso(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    // `new Date('2026-07-09T18:15')` is parsed in the viewer's timezone.
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString();
}
