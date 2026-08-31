import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { contrastRatio } from './support/contrast';

/**
 * The themes are defined once, as custom properties in `app.css`, so the
 * contrast the brief requires can be proven against the tokens themselves
 * rather than sampled from a screenshot.
 *
 * Read the file rather than a built stylesheet: this has to fail when someone
 * edits a token, not when someone forgets to rebuild.
 */
const css = readFileSync(
    new URL('../../resources/css/app.css', import.meta.url),
    'utf8',
);

/** Pull the `--token: value;` declarations out of one top-level rule. */
function tokensIn(selector: string): Record<string, string> {
    const start = css.indexOf(`${selector} {`);
    expect(start, `no ${selector} block in app.css`).toBeGreaterThan(-1);

    const body = css.slice(start, css.indexOf('\n}', start));
    const tokens: Record<string, string> = {};

    for (const match of body.matchAll(/^ {4}(--[\w-]+):\s*([^;]+);/gm)) {
        tokens[match[1]] = match[2].trim();
    }

    return tokens;
}

const THEMES = {
    light: tokensIn(':root'),
    dark: tokensIn('.dark'),
};

/** Text has to clear 4.5:1; WCAG 1.4.3. */
const TEXT_PAIRS: [string, string, string][] = [
    ['--foreground', '--background', 'body text on the page'],
    ['--card-foreground', '--card', 'body text on a card'],
    ['--popover-foreground', '--popover', 'text in a popover'],
    ['--muted-foreground', '--background', 'secondary text on the page'],
    ['--muted-foreground', '--card', 'secondary text on a card'],
    ['--muted-foreground', '--muted', 'secondary text on a muted panel'],
    ['--primary-foreground', '--primary', 'label on the primary button'],
    ['--primary-foreground', '--primary-hover', 'primary button, hovered'],
    ['--accent-foreground', '--accent', 'label on the accent button'],
    ['--accent-foreground', '--accent-hover', 'accent button, hovered'],
    ['--secondary-foreground', '--secondary', 'label on the secondary button'],
    [
        '--destructive-foreground',
        '--destructive',
        'label on a destructive button',
    ],
    ['--primary-text', '--background', 'link on the page'],
    ['--primary-text', '--card', 'link on a card'],
    ['--primary-text', '--primary-surface', 'primary text on its own tint'],
    ['--accent-strong', '--background', 'accent text on the page'],
    ['--accent-strong', '--card', 'accent text on a card'],
    ['--accent-strong', '--accent-surface', 'accent text on its own tint'],
    ['--success-foreground', '--success', 'label on a success fill'],
    ['--warning-foreground', '--warning', 'label on a warning fill'],
    ['--info-foreground', '--info', 'label on an info fill'],
    ['--danger-foreground', '--danger', 'label on a danger fill'],
    ['--success', '--success-surface', 'success pill'],
    ['--warning', '--warning-surface', 'warning pill'],
    ['--info', '--info-surface', 'info pill'],
    ['--danger', '--danger-surface', 'danger pill'],
    ['--sidebar-foreground', '--sidebar', 'sidebar text'],
    ['--sidebar-accent-foreground', '--sidebar-accent', 'active sidebar item'],
];

/** Control boundaries and focus rings have to clear 3:1; WCAG 1.4.11. */
const NON_TEXT_PAIRS: [string, string, string][] = [
    ['--input', '--background', 'input border on the page'],
    ['--input', '--card', 'input border on a card'],
    ['--border-strong', '--background', 'emphasised divider'],
    ['--ring', '--background', 'focus ring on the page'],
    ['--ring', '--card', 'focus ring on a card'],
];

for (const [themeName, tokens] of Object.entries(THEMES)) {
    test.describe(`${themeName} theme contrast`, () => {
        for (const [fg, bg, what] of TEXT_PAIRS) {
            test(`${what} clears 4.5:1`, () => {
                expect(tokens[fg], `${fg} is missing`).toBeTruthy();
                expect(tokens[bg], `${bg} is missing`).toBeTruthy();
                expect(
                    contrastRatio(tokens[fg], tokens[bg]),
                ).toBeGreaterThanOrEqual(4.5);
            });
        }

        for (const [fg, bg, what] of NON_TEXT_PAIRS) {
            test(`${what} clears 3:1`, () => {
                expect(
                    contrastRatio(tokens[fg], tokens[bg]),
                ).toBeGreaterThanOrEqual(3);
            });
        }
    });
}

/**
 * The brief pins these two as identity. They may gain accessible siblings
 * (`--primary-text`, `--accent-strong`) but the fills themselves do not move.
 */
test('brand colours are preserved exactly', () => {
    expect(THEMES.light['--primary']).toBe('#1176bc');
    expect(THEMES.dark['--primary']).toBe('#1176bc');
    expect(THEMES.light['--accent']).toBe('#8dc641');
    expect(THEMES.dark['--accent']).toBe('#8dc641');
});

/**
 * Dark mode gets its depth from the surface ladder rather than from shadows,
 * which have almost nothing to darken on a near-black ground. These were all
 * the same value before, which is why cards and popovers had no edge.
 */
test('dark surfaces form a visible elevation ladder', () => {
    const { dark } = THEMES;
    const luminanceOf = (token: string) =>
        contrastRatio(dark[token], '#000000');

    expect(luminanceOf('--card')).toBeGreaterThan(luminanceOf('--background'));
    expect(luminanceOf('--popover')).toBeGreaterThan(luminanceOf('--card'));
});

/**
 * The pre-paint background in `app.blade.php` is a hard-coded copy of
 * `--background` (it has to run before the stylesheet), so it can drift. A
 * mismatch shows as a flash of the wrong colour on first paint.
 */
test('the blade pre-paint background matches the tokens', () => {
    const blade = readFileSync(
        new URL('../../resources/views/app.blade.php', import.meta.url),
        'utf8',
    );

    const light = /html\s*\{\s*background-color:\s*([^;]+);/.exec(blade);
    const dark = /html\.dark\s*\{\s*background-color:\s*([^;]+);/.exec(blade);

    expect(light?.[1].trim()).toBe(THEMES.light['--background']);
    expect(dark?.[1].trim()).toBe(THEMES.dark['--background']);
});
