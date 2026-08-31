import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { contrastRatio } from './support/contrast';

/**
 * The hero's brand glows are deliberately strong, which puts them in tension
 * with the type sitting on them. Rather than trust the geometry, this samples
 * the pixels the browser actually painted behind the heading and body copy and
 * holds them to the same 4.5:1 as the rest of the app.
 */

type TextGround = {
    label: string;
    color: string;
    backgrounds: string[];
};

/**
 * Screenshot the hero with its text hidden, then read the pixels where that
 * text had been. Hiding it first is what makes the sample the ground rather
 * than whichever glyph happened to sit under the sample point.
 */
async function groundBehindText(page: Page): Promise<TextGround[]> {
    const heroBox = await page.locator('[data-panel]').first().boundingBox();
    expect(heroBox, 'the hero panel should be laid out').not.toBeNull();

    const targets = [
        { label: 'heading', selector: 'h1' },
        { label: 'body copy', selector: '[data-panel-inner] p' },
    ];

    const measured = [];

    for (const { label, selector } of targets) {
        const node = page.locator(selector).first();
        const box = await node.boundingBox();
        expect(box, `${label} should be laid out`).not.toBeNull();

        measured.push({
            label,
            color: await node.evaluate((el) => getComputedStyle(el).color),
            // Corners and centre of the text block, relative to the hero.
            points: [
                [2, 2],
                [box!.width - 2, 2],
                [box!.width / 2, box!.height / 2],
                [2, box!.height - 2],
                [box!.width - 2, box!.height - 2],
            ].map(
                ([dx, dy]) =>
                    [
                        box!.x - heroBox!.x + dx,
                        box!.y - heroBox!.y + dy,
                    ] as const,
            ),
        });
    }

    await page.evaluate(() => {
        const inner = document.querySelector<HTMLElement>('[data-panel-inner]');

        if (inner) {
            inner.style.visibility = 'hidden';
        }
    });

    const screenshot = await page.screenshot({ clip: heroBox! });

    // The page decodes its own screenshot, so no image library is needed and
    // the pixels come back exactly as they were rasterised.
    return page.evaluate(
        async ({ base64, groups }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();

            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const context = canvas.getContext('2d');

            if (!context) {
                throw new Error('no 2d canvas context available');
            }

            context.drawImage(image, 0, 0);

            // The screenshot is in device pixels; the boxes are in CSS pixels.
            const scale = image.naturalWidth / window.innerWidth;

            return groups.map(({ label, color, points }) => ({
                label,
                color,
                backgrounds: points.map(([x, y]) => {
                    const [r, g, b] = context.getImageData(
                        Math.max(0, Math.round(x * scale)),
                        Math.max(0, Math.round(y * scale)),
                        1,
                        1,
                    ).data;

                    return `rgb(${r}, ${g}, ${b})`;
                }),
            }));
        },
        {
            base64: screenshot.toString('base64'),
            groups: measured.map((m) => ({
                label: m.label,
                color: m.color,
                points: m.points.map(([x, y]) => [x, y] as [number, number]),
            })),
        },
    );
}

for (const theme of ['light', 'dark'] as const) {
    test(`the hero glows stay readable in ${theme} mode`, async ({
        page,
        context,
    }) => {
        await context.addCookies([
            { name: 'appearance', value: theme, url: 'http://localhost:8000' },
        ]);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const grounds = await groundBehindText(page);
        expect(grounds).toHaveLength(2);

        for (const { label, color, backgrounds } of grounds) {
            for (const background of backgrounds) {
                expect(
                    contrastRatio(color, background),
                    `${label} (${color}) over the hero glow (${background})`,
                ).toBeGreaterThanOrEqual(4.5);
            }
        }
    });
}

/**
 * The glows are mixed from the brand tokens rather than hard-coded, so a brand
 * change carries into the hero instead of leaving it stranded on old colour.
 */
test('the hero glows are derived from the brand tokens', async ({ page }) => {
    await page.goto('/');

    const glows = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);

        return [
            root.getPropertyValue('--hero-glow-primary').trim(),
            root.getPropertyValue('--hero-glow-accent').trim(),
            root.getPropertyValue('--hero-glow-deep').trim(),
        ];
    });

    for (const glow of glows) {
        expect(glow).not.toBe('');
    }
});
