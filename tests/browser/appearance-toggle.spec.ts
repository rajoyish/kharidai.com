import { expect, test } from '@playwright/test';

const SWITCH = { role: 'switch' as const, name: 'Dark theme' };

test.describe('theme switch', () => {
    test('follows the system colour scheme until the visitor chooses otherwise', async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/');

        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(
            page.getByRole(SWITCH.role, { name: SWITCH.name }),
        ).toBeChecked();

        // The unchosen default has to keep tracking the OS rather than latching
        // onto whatever it resolved to on the first paint.
        await page.emulateMedia({ colorScheme: 'light' });
        await expect(page.locator('html')).not.toHaveClass(/dark/);
        await expect(
            page.getByRole(SWITCH.role, { name: SWITCH.name }),
        ).not.toBeChecked();
    });

    test('one click switches to dark and it survives a reload', async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/');
        await expect(page.locator('html')).not.toHaveClass(/dark/);

        await page.getByRole(SWITCH.role, { name: SWITCH.name }).click();

        await expect(page.locator('html')).toHaveClass(/dark/);

        // A cookie, not just localStorage: the server reads it to render the
        // first paint dark, which is what stops the white flash on reload.
        const cookie = (await page.context().cookies()).find(
            (candidate) => candidate.name === 'appearance',
        );
        expect(cookie?.value).toBe('dark');

        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(
            page.getByRole(SWITCH.role, { name: SWITCH.name }),
        ).toBeChecked();
    });

    test('an explicit light choice overrides a dark system preference', async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/');
        await expect(page.locator('html')).toHaveClass(/dark/);

        await page.getByRole(SWITCH.role, { name: SWITCH.name }).click();

        await expect(page.locator('html')).not.toHaveClass(/dark/);

        await page.reload();
        await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('it is operable from the keyboard', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/');

        const control = page.getByRole(SWITCH.role, { name: SWITCH.name });
        await control.focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(control).toBeFocused();
    });

    /**
     * The switch reads the `dark` class rather than the stored preference, so it
     * has to stay honest when the theme is changed by the three-way control on
     * the settings page instead of by the switch itself.
     */
    test('it reflects a theme changed from somewhere else', async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/settings/appearance');

        const control = page.getByRole(SWITCH.role, { name: SWITCH.name });
        await expect(control).not.toBeChecked();

        await page.getByRole('button', { name: 'Dark', exact: true }).click();

        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(control).toBeChecked();
    });

    /**
     * The switch is the fast path; the full three-way choice, including
     * "System", stays reachable so a visitor can hand control back to the OS.
     */
    test('the settings page still offers all three choices', async ({
        page,
    }) => {
        await page.goto('/settings/appearance');

        for (const label of ['Light', 'Dark', 'System']) {
            await expect(
                page.getByRole('button', { name: label, exact: true }),
            ).toBeVisible();
        }
    });

    /**
     * The cookie is what the server renders the first paint from, and a browser
     * can drop localStorage while keeping cookies. When that happens the choice
     * has to survive rather than being silently reset to "system".
     */
    test('a preference held only in the cookie survives', async ({
        page,
        context,
    }) => {
        await page.emulateMedia({ colorScheme: 'light' });

        // The suite's shared storage state carries a localStorage entry, so it
        // has to be cleared for this to be the divergence it is describing.
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('appearance'));
        await context.addCookies([
            { name: 'appearance', value: 'dark', url: 'http://localhost:8000' },
        ]);
        await page.reload();

        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(
            page.getByRole(SWITCH.role, { name: SWITCH.name }),
        ).toBeChecked();

        // And the missing half is refilled, so the two cannot drift again.
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('appearance')))
            .toBe('dark');
    });

    test('the drawer carries the theme control on small screens', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');

        await page.getByRole('button', { name: 'Toggle Menu' }).click();

        await expect(
            page.getByRole('heading', { name: 'Theme', exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Dark', exact: true }).click();

        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    /**
     * The theme swap is animated, but only for its own duration: a standing
     * transition would smear every hover state on the page.
     */
    test('the transition is armed only while the theme is changing', async ({
        page,
    }) => {
        await page.goto('/');

        const root = page.locator('html');
        await expect(root).not.toHaveAttribute('data-theme-switching', /.*/);

        await page.getByRole(SWITCH.role, { name: SWITCH.name }).click();

        await expect(root).not.toHaveAttribute('data-theme-switching', /.*/, {
            timeout: 2000,
        });
    });
});
