import { expect, test } from '@playwright/test';

const ORDER_NUMBER = 'ORD-PLAYWRIGHT';

/**
 * Covers the click-to-copy control beside every order number. The Clipboard API
 * only resolves for a page holding clipboard permission, so the context grants
 * it before the page loads.
 */
test.describe('Copy order number', () => {
    test.beforeEach(async ({ context }) => {
        await context.grantPermissions([
            'clipboard-read',
            'clipboard-write',
        ]);
    });

    test('copies the order number and confirms it', async ({ page }) => {
        await page.goto('/admin/orders');

        const row = page.getByRole('row', { name: ORDER_NUMBER });
        await expect(row).toBeVisible();

        await row.getByRole('button', { name: 'Copy order number' }).click();

        await expect(
            page.getByText(`${ORDER_NUMBER} copied to clipboard`),
        ).toBeAttached();

        const clipboardText = await page.evaluate(() =>
            navigator.clipboard.readText(),
        );

        expect(clipboardText).toBe(ORDER_NUMBER);
    });

    test('copies from the order detail page', async ({ page }) => {
        await page.goto('/admin/orders');
        await page
            .getByRole('link', { name: ORDER_NUMBER, exact: true })
            .first()
            .click();

        await page
            .getByRole('button', { name: 'Copy order number' })
            .first()
            .click();

        const clipboardText = await page.evaluate(() =>
            navigator.clipboard.readText(),
        );

        expect(clipboardText).toBe(ORDER_NUMBER);
    });
});
