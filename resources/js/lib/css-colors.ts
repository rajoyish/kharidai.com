/**
 * True when the browser recognizes the string as a CSS color. This covers every
 * named CSS color (e.g. "red", "teal") as well as any valid color value such as
 * a hex code ("#50C878"), `rgb(...)`, or `hsl(...)`.
 *
 * Custom names the CSS spec doesn't know (e.g. "emerald", "darkpurple") return
 * false — for those, enter an equivalent hex code as the color value instead, so
 * both the storefront and admin can still preview a swatch.
 */
export function isCssColor(value: string): boolean {
    return typeof CSS !== 'undefined' && CSS.supports('color', value.trim());
}
