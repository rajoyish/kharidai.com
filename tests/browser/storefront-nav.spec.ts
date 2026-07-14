import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TRACK = '[data-slot="nav-scroller-track"]';

/**
 * The builder's item list. Assertions are scoped to it because Radix mirrors the
 * "nested under" select into a hidden native `<select>`, so every item's label
 * also appears as an `<option>` elsewhere on the page.
 */
const ITEM_LIST = '[data-slot="menu-items"]';

/**
 * Long labels, so the nav overflows a narrow desktop viewport without needing a
 * dozen of them. These are added through the builder rather than the seeder, so
 * the spec covers the admin round-trip too.
 */
const ITEMS = [
    { label: 'Corporate Responsibility', url: '/about' },
    { label: 'Warranty & Returns Policy', url: '/returns' },
    { label: 'International Shipping Info', url: '/shipping' },
    { label: 'Frequently Asked Questions', url: '/faq' },
    { label: 'Partner With Kharidai', url: '/partners' },
];

/**
 * A parent and its child, so the header has a real dropdown to open. The parent
 * deliberately has no URL of its own: it exists only to open the dropdown, which
 * is the case that used to force a placeholder `#` and make the parent render as
 * a link inside its own panel.
 */
const DROPDOWN_PARENT = { label: 'Help Centre', url: '' };

/** Points at a real route, so the spec can click through it and land somewhere. */
const DROPDOWN_CHILD = { label: 'Browse Services', url: '/services' };

/** Everything the spec creates at the top level; children cascade on delete. */
const TOP_LEVEL = [...ITEMS, DROPDOWN_PARENT];

async function addMenuItem(
    page: Page,
    label: string,
    url: string,
    parent?: string,
) {
    await page.getByLabel('Display name').fill(label);
    await page.getByLabel('URL').fill(url);

    if (parent) {
        await page.getByLabel('Nested under').click();
        await page.getByRole('option', { name: parent, exact: true }).click();
    }

    await page.getByRole('button', { name: 'Add item', exact: true }).click();
    await expect(
        page.locator(ITEM_LIST).getByText(label, { exact: true }),
    ).toBeVisible();
}

test.describe('storefront navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin/menus');

        for (const item of TOP_LEVEL) {
            await addMenuItem(page, item.label, item.url);
        }

        await addMenuItem(
            page,
            DROPDOWN_CHILD.label,
            DROPDOWN_CHILD.url,
            DROPDOWN_PARENT.label,
        );
    });

    test.afterEach(async ({ page }) => {
        await page.goto('/admin/menus');

        // Remove only what this spec added, so the shared database is left as
        // the other specs expect to find it. The nested child goes with its
        // parent, which is what the cascade is for.
        const list = page.locator(ITEM_LIST);

        for (const item of TOP_LEVEL) {
            // A parent `<li>` wraps its children's rows too, so target the row's
            // own controls rather than every Delete button beneath it.
            const row = list
                .locator('li', { hasText: item.label })
                .first()
                .locator('> div')
                .first();

            await row.getByRole('button', { name: 'Delete' }).click();
            await page
                .getByRole('alertdialog')
                .getByRole('button', { name: 'Delete' })
                .click();
            await expect(
                list.getByText(item.label, { exact: true }),
            ).toBeHidden();
        }
    });

    test('the admin menu is what the storefront header renders', async ({
        page,
    }) => {
        await page.goto('/');

        const track = page.locator(TRACK);

        for (const item of ITEMS) {
            await expect(
                track.getByRole('link', { name: item.label }),
            ).toHaveAttribute('href', item.url);
        }
    });

    test('the builder form clears after saving instead of lagging an item behind', async ({
        page,
    }) => {
        // The form used to reset to the *previous* item's values, because
        // `reset()` read the defaults `setDefaults()` had not committed yet.
        await page.goto('/admin/menus');

        const label = page.getByLabel('Display name');
        const url = page.getByLabel('URL');

        // Adding an item must leave a blank form, not the values just submitted.
        await expect(label).toHaveValue('');
        await expect(url).toHaveValue('');

        // Editing must load that item's values immediately, on the first click.
        await page
            .locator(ITEM_LIST)
            .locator('li', { hasText: ITEMS[0].label })
            .first()
            .locator('> div')
            .first()
            .getByRole('button', { name: 'Edit' })
            .click();

        await expect(label).toHaveValue(ITEMS[0].label);
        await expect(url).toHaveValue(ITEMS[0].url);

        // And cancelling must return to a blank form, not the edited values.
        await page.getByRole('button', { name: 'Cancel' }).click();

        await expect(label).toHaveValue('');
        await expect(url).toHaveValue('');
    });

    test('an overflowing nav scrolls instead of breaking the header', async ({
        page,
    }) => {
        // Narrow enough that the desktop nav is on, but the items cannot fit.
        await page.setViewportSize({ width: 900, height: 800 });
        await page.goto('/');

        const track = page.locator(TRACK);
        await expect(track).toBeVisible();

        const header = page.locator('header');
        const overflows = await track.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
        );

        expect(overflows).toBe(true);

        // The whole point: the header keeps its single-row height and the page
        // itself never gains a horizontal scrollbar.
        expect((await header.boundingBox())!.height).toBeLessThanOrEqual(65);

        const pageOverflows = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        );

        expect(pageOverflows).toBe(false);
    });

    test('the arrows page the nav track in both directions', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 900, height: 800 });
        await page.goto('/');

        const track = page.locator(TRACK);
        const right = page.getByRole('button', {
            name: 'Scroll navigation right',
        });
        const left = page.getByRole('button', {
            name: 'Scroll navigation left',
        });

        // At rest there is nothing to the left, so only the right arrow shows.
        await expect(right).toBeVisible();
        await expect(left).toBeHidden();

        await right.click();
        await expect(left).toBeVisible();
        await expect
            .poll(() => track.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(0);

        await left.click();
        await expect
            .poll(() => track.evaluate((element) => element.scrollLeft))
            .toBe(0);
        await expect(left).toBeHidden();
    });

    test('a nested item opens as a dropdown, clear of the scrolling track', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 900, height: 800 });
        await page.goto('/');

        const track = page.locator(TRACK);

        await track
            .getByRole('button', { name: DROPDOWN_PARENT.label })
            .click();

        const panel = page.locator('[data-slot="dropdown-menu-content"]');
        await expect(panel).toBeVisible();

        // Entries carry role="menuitem", not "link" — Radix owns the semantics
        // of the panel — but they remain real anchors, so the href still holds.
        await expect(
            panel.getByRole('menuitem', { name: DROPDOWN_CHILD.label }),
        ).toHaveAttribute('href', DROPDOWN_CHILD.url);

        // A parent with no destination of its own must not appear as an entry in
        // the very dropdown it opens — that is the duplicate-label bug.
        await expect(
            panel.getByRole('menuitem', { name: DROPDOWN_PARENT.label }),
        ).toHaveCount(0);

        // The track clips its own overflow, so a panel rendered inside it would
        // be cut off at the header's edge. Portaling is what keeps it whole:
        // the panel must extend below the track it hangs from.
        const panelBox = (await panel.boundingBox())!;
        const trackBox = (await track.boundingBox())!;

        expect(panelBox.y + panelBox.height).toBeGreaterThan(
            trackBox.y + trackBox.height,
        );
    });

    test('choosing a dropdown item navigates and closes the dropdown', async ({
        page,
    }) => {
        // A bare anchor inside the panel navigates but leaves the menu hanging
        // open over the new page; Radix only closes on a registered selection.
        await page.setViewportSize({ width: 900, height: 800 });
        await page.goto('/');

        await page
            .locator(TRACK)
            .getByRole('button', { name: DROPDOWN_PARENT.label })
            .click();

        const panel = page.locator('[data-slot="dropdown-menu-content"]');
        await expect(panel).toBeVisible();

        await panel
            .getByRole('menuitem', { name: DROPDOWN_CHILD.label })
            .click();

        await expect(page).toHaveURL(new RegExp(`${DROPDOWN_CHILD.url}$`));
        await expect(panel).toBeHidden();
    });
});

// The footer's page column is asserted server-side in SsrGuestRenderTest, which
// can seed a page; this covers only that the payment image actually loads.
test('the footer shows the accepted payment methods', async ({ page }) => {
    await page.goto('/');

    const image = page
        .locator('footer')
        .getByRole('img', { name: /payment methods/i });

    await expect(page.locator('footer').getByText('We accept:')).toBeVisible();
    await expect(image).toBeVisible();

    // A broken src still renders an <img> box, so pin that the file resolved.
    await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
});
