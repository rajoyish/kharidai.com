import { expect, test } from '@playwright/test';

const PRODUCT_TO_DELETE = 'Playwright Delete Me';
const PRODUCT_TO_KEEP = 'Playwright Keep Me';

/**
 * Covers the debounced SearchFilter on the admin product list. The filtering is
 * server-side, so what matters is that typing eventually lands one request that
 * narrows the table and leaves a shareable `?search=` URL behind.
 */
test.describe('Admin search', () => {
    test('typing filters the table and records the term in the URL', async ({
        page,
    }) => {
        await page.goto('/admin/products');

        const searchBox = page.getByRole('searchbox', {
            name: 'Search products...',
        });

        await searchBox.fill('Keep Me');

        await expect(
            page.getByRole('row', { name: PRODUCT_TO_KEEP }),
        ).toBeVisible();
        await expect(
            page.getByRole('row', { name: PRODUCT_TO_DELETE }),
        ).toHaveCount(0);
        await expect(page).toHaveURL(/[?&]search=Keep%20Me/);
    });

    test('a term with no matches shows the empty state', async ({ page }) => {
        await page.goto('/admin/products?search=nothing-matches-this');

        await expect(
            page.getByText('No products match your search.'),
        ).toBeVisible();
    });

    test('the search term survives a reload', async ({ page }) => {
        await page.goto('/admin/products?search=Keep+Me');

        await expect(
            page.getByRole('searchbox', { name: 'Search products...' }),
        ).toHaveValue('Keep Me');
        await expect(
            page.getByRole('row', { name: PRODUCT_TO_KEEP }),
        ).toBeVisible();
    });
});
