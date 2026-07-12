import { expect, test } from '@playwright/test';

const PRODUCT_TO_DELETE = 'Playwright Delete Me';
const PRODUCT_TO_KEEP = 'Playwright Keep Me';

/**
 * Covers the ConfirmDialog that replaced `window.confirm()` on the admin
 * product list. The dialog is the only thing standing between an admin and an
 * irreversible delete, so both branches matter: cancelling must not issue the
 * request, and confirming must actually persist.
 *
 * These run in declaration order against a shared database — the cancel case
 * relies on the product still existing.
 */
test.describe('Admin product delete confirmation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin/products');
    });

    test('cancelling the dialog leaves the product in place', async ({
        page,
    }) => {
        const row = page.getByRole('row', { name: PRODUCT_TO_DELETE });
        await expect(row).toBeVisible();

        await row.getByRole('button', { name: 'Delete' }).click();

        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(
            'Are you sure you want to delete this product?',
        );
        await expect(dialog).toContainText(PRODUCT_TO_DELETE);

        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).toBeHidden();

        // Survives a round-trip, so cancelling issued no delete request.
        await page.reload();
        await expect(
            page.getByRole('row', { name: PRODUCT_TO_DELETE }),
        ).toBeVisible();
    });

    test('confirming the dialog deletes only that product', async ({ page }) => {
        await page
            .getByRole('row', { name: PRODUCT_TO_DELETE })
            .getByRole('button', { name: 'Delete' })
            .click();

        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: 'Delete' }).click();

        await expect(
            page.getByRole('row', { name: PRODUCT_TO_DELETE }),
        ).toHaveCount(0);
        await expect(
            page.getByRole('row', { name: PRODUCT_TO_KEEP }),
        ).toBeVisible();

        await page.reload();
        await expect(
            page.getByRole('row', { name: PRODUCT_TO_DELETE }),
        ).toHaveCount(0);
        await expect(
            page.getByRole('row', { name: PRODUCT_TO_KEEP }),
        ).toBeVisible();
    });
});
