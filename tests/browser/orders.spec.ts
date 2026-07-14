import { expect, test } from '@playwright/test';

test.describe('Orders Page Tests', () => {
    test('should navigate to the orders page and show correct UI elements', async ({
        page,
    }) => {
        await page.goto('/orders');

        // The specs run as an authenticated admin, so the page must actually
        // render — a redirect to login would mean the storage state is broken,
        // not that the route is protected.
        await expect(page).toHaveURL(/\/orders$/);
        await expect(
            page.getByRole('heading', { name: 'My Orders' }),
        ).toBeVisible();

        // Any "Reupload Receipt" control must carry an accessible name.
        const reupload = page.getByRole('link', { name: /Reupload Receipt/i });

        if ((await reupload.count()) > 0) {
            await expect(reupload.first()).toBeVisible();
        }
    });
});
