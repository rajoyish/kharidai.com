/**
 * Display helpers for supplier wallet credits and per-credit rates.
 *
 * Credits travel from the server as exact eight-place decimal strings
 * ("8.09676294"); these helpers only format them for reading. Keep form
 * state as the raw string so no precision is lost on the way back.
 */

const creditFormat = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
});

const rateFormat = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
});

const percentFormat = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

/** A credit amount, trailing zeros past two places dropped: "8.09676294", "2.04". */
export function formatCredits(value: string | number | null): string {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount) ? creditFormat.format(amount) : '0.00';
}

/** An NPR-per-credit rate, e.g. "Rs. 195.5856 / credit". */
export function formatRate(value: string | number | null): string {
    if (value === null || value === '') {
        return '—';
    }

    return `Rs. ${rateFormat.format(Number(value))} / credit`;
}

/** A signed percentage, e.g. "+20.5%" or "−3.2%". */
export function formatSignedPercent(value: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';

    return `${sign}${percentFormat.format(Math.abs(value))}%`;
}

/** A plain percentage, e.g. "80.9%". */
export function formatPercent(value: string | number | null): string {
    if (value === null || value === '') {
        return '—';
    }

    return `${percentFormat.format(Number(value))}%`;
}
