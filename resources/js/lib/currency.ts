/**
 * Display-only NPR formatting in the South Asian numbering system
 * (lakh/crore grouping). Whole amounts drop the paisa portion and
 * fractional amounts keep two digits, so 100000 -> "Rs. 1,00,000"
 * and 26063.5 -> "Rs. 26,063.50".
 *
 * This conditional-decimal rule lives only here so it applies uniformly
 * across the Storefront, User Panel, and Admin Panel; call sites must not
 * append their own toFixed()/toLocaleString() variants. Keep React state
 * and Inertia form payloads as raw numbers; call these helpers only at
 * render time so formatted strings never travel back to the server.
 */

const wholeRupees = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
});

const rupeesWithPaisa = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** The grouped amount without the "Rs." label, e.g. 100000 -> "1,00,000". */
export function formatNprAmount(value: number | string): string {
    const amount = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(amount)) {
        return wholeRupees.format(0);
    }

    // Decide on the paisa-rounded value so float noise from upstream
    // arithmetic (e.g. 26063.000000001) still renders as a whole amount.
    const paisaRounded = Math.round(amount * 100) / 100;

    return Number.isInteger(paisaRounded)
        ? wholeRupees.format(paisaRounded)
        : rupeesWithPaisa.format(paisaRounded);
}

/** The grouped amount with the "Rs." label, e.g. 100000 -> "Rs. 1,00,000". */
export function formatNpr(value: number | string): string {
    return `Rs. ${formatNprAmount(value)}`;
}
