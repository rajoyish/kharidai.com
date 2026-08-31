/**
 * WCAG 2.1 relative-luminance contrast for the colour formats this project's
 * design tokens are written in: hex and `oklch()`.
 *
 * The token values are the source of truth for the themes, so the ratios that
 * matter can be checked without rendering a page.
 */

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const encodeGamma = (c: number): number =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const decodeGamma = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

function oklchToSrgb(L: number, C: number, hueDegrees: number): number[] {
    const h = (hueDegrees * Math.PI) / 180;
    const a = C * Math.cos(h);
    const b = C * Math.sin(h);

    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        // Gamma-encoded and clamped to what a display can actually show, so an
        // out-of-gamut token is measured as the colour that reaches the eye.
    ].map((v) => clamp(encodeGamma(v)));
}

export function parseColor(input: string): number[] {
    const value = input.trim();

    const longHex = /^#([0-9a-f]{6})$/i.exec(value);

    if (longHex) {
        const n = parseInt(longHex[1], 16);

        return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
    }

    const shortHex = /^#([0-9a-f]{3})$/i.exec(value);

    if (shortHex) {
        return shortHex[1].split('').map((c) => parseInt(c + c, 16) / 255);
    }

    const oklch = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i.exec(value);

    if (oklch) {
        const lightness = oklch[1].endsWith('%')
            ? parseFloat(oklch[1]) / 100
            : parseFloat(oklch[1]);

        return oklchToSrgb(
            lightness,
            parseFloat(oklch[2]),
            parseFloat(oklch[3]),
        );
    }

    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);

    if (rgb) {
        return [rgb[1], rgb[2], rgb[3]].map((v) => parseFloat(v) / 255);
    }

    if (value === 'white') {
        return [1, 1, 1];
    }

    if (value === 'black') {
        return [0, 0, 0];
    }

    throw new Error(`Unsupported colour format: ${input}`);
}

export function relativeLuminance(srgb: number[]): number {
    const [r, g, b] = srgb.map(decodeGamma);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1:1 to 21:1. */
export function contrastRatio(foreground: string, background: string): number {
    const a = relativeLuminance(parseColor(foreground));
    const b = relativeLuminance(parseColor(background));
    const [lighter, darker] = a > b ? [a, b] : [b, a];

    return (lighter + 0.05) / (darker + 0.05);
}
