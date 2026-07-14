import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const ITEM_LIST = '[data-slot="menu-items"]';

/** One nesting level, in pixels — mirrors INDENT_WIDTH in lib/menu-tree.ts. */
const INDENT = 40;

const ALPHA = { label: 'Alpha Item', url: '/alpha' };
const BETA = { label: 'Beta Item', url: '/beta' };
const GAMMA = { label: 'Gamma Item', url: '/gamma' };

const CREATED = [ALPHA, BETA, GAMMA];

async function addMenuItem(page: Page, label: string, url: string) {
    await page.getByLabel('Display name').fill(label);
    await page.getByLabel('URL').fill(url);
    await page.getByRole('button', { name: 'Add item', exact: true }).click();
    await expect(
        page.locator(ITEM_LIST).getByText(label, { exact: true }),
    ).toBeVisible();
}

/** The rows in render order, each with the indent that encodes its nesting. */
async function rows(page: Page) {
    return page.locator(`${ITEM_LIST} li`).evaluateAll((items) =>
        items.map((item) => ({
            label: item.querySelector('span.font-medium')?.textContent?.trim(),
            indent: parseFloat(getComputedStyle(item).paddingLeft),
        })),
    );
}

function handle(page: Page, label: string) {
    return page.getByRole('button', { name: `Reorder ${label}` });
}

/**
 * Drives dnd-kit with a real pointer, by a *delta* from the row's handle.
 *
 * The delta is what matters: dnd-kit reads horizontal travel since the grab to
 * propose the nesting depth. Aiming at an absolute x would silently measure from
 * wherever the handle happens to sit, which is the left edge of the row — so
 * "drag left" computed from a row's centre is really a large drag right.
 *
 * The move is stepped because the sensor needs to cross its activation distance
 * and see intermediate positions to sort against; one jump sorts nothing.
 */
async function dragRowBy(page: Page, label: string, dx: number, dy: number) {
    const box = (await handle(page, label).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 8, { steps: 5 });
    await page.mouse.move(x + dx, y + dy, { steps: 20 });
    await page.mouse.up();
}

/** Vertical distance from one row's handle to another row's centre. */
async function distanceTo(page: Page, from: string, to: string) {
    const source = (await handle(page, from).boundingBox())!;
    const target = (await page
        .locator(`${ITEM_LIST} li`, { hasText: to })
        .first()
        .boundingBox())!;

    return target.y + target.height / 2 - (source.y + source.height / 2);
}

/** The indent of a row, which is what encodes its nesting. */
async function indentOf(page: Page, label: string) {
    const current = await rows(page);

    return current.find((row) => row.label === label)?.indent;
}

test.describe('menu builder drag and drop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin/menus');

        for (const item of CREATED) {
            await addMenuItem(page, item.label, item.url);
        }
    });

    test.afterEach(async ({ page }) => {
        await page.goto('/admin/menus');

        const list = page.locator(ITEM_LIST);

        for (const item of CREATED) {
            const remove = list.getByRole('button', {
                name: `Delete ${item.label}`,
            });

            // These specs nest items, and deleting a parent cascades — so by the
            // time the loop reaches a child it may already be gone.
            if ((await remove.count()) === 0) {
                continue;
            }

            await remove.click();
            await page
                .getByRole('alertdialog')
                .getByRole('button', { name: 'Delete' })
                .click();
            await expect(
                list.getByText(item.label, { exact: true }),
            ).toBeHidden();
        }
    });

    test('dragging a row reorders it, and the order survives a reload', async ({
        page,
    }) => {
        expect((await rows(page)).map((row) => row.label)).toEqual([
            ALPHA.label,
            BETA.label,
            GAMMA.label,
        ]);

        await dragRowBy(
            page,
            ALPHA.label,
            0,
            await distanceTo(page, ALPHA.label, GAMMA.label),
        );

        await expect
            .poll(async () => (await rows(page)).map((row) => row.label))
            .toEqual([BETA.label, GAMMA.label, ALPHA.label]);

        await page.reload();

        expect((await rows(page)).map((row) => row.label)).toEqual([
            BETA.label,
            GAMMA.label,
            ALPHA.label,
        ]);
    });

    test('dragging a row sideways nests it under the one above', async ({
        page,
    }) => {
        // Beta stays in its own slot but is pushed right, which nests it under
        // Alpha — the row above it.
        await dragRowBy(page, BETA.label, INDENT * 2, 0);

        await expect.poll(() => indentOf(page, BETA.label)).toBe(INDENT);

        await page.reload();

        // Nested on the server too, not just on screen.
        expect(await indentOf(page, BETA.label)).toBe(INDENT);
    });

    test('a nested row can be dragged back out to the top level', async ({
        page,
    }) => {
        await dragRowBy(page, GAMMA.label, INDENT * 2, 0);
        await expect.poll(() => indentOf(page, GAMMA.label)).toBe(INDENT);

        // Now pull it left again. Dragging by a delta from the handle is what
        // makes this a genuine leftward drag.
        await dragRowBy(page, GAMMA.label, -INDENT * 3, 0);

        await expect.poll(() => indentOf(page, GAMMA.label)).toBe(0);

        await page.reload();

        expect(await indentOf(page, GAMMA.label)).toBe(0);
    });
});
