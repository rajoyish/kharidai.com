import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const DIGITAL_ORDER_NUMBER = 'ORD-PLAYWRIGHT';
const COMPLETED_ORDER_NUMBER = 'ORD-PLAYWRIGHT-DONE';

/**
 * Covers the payment breakdown on the admin order detail page: a digital order
 * carries no shipping line, and the amount-due row reads "Paid" once the order
 * is completed and "Due now" before that.
 */
test.describe('Order payment breakdown', () => {
    const openOrder = async (page: Page, orderNumber: string) => {
        await page.goto('/admin/orders');
        await page
            .getByRole('link', { name: orderNumber, exact: true })
            .first()
            .click();

        return page
            .getByRole('heading', { name: 'Payment Breakdown' })
            .locator('..');
    };

    test('hides the shipping line and marks the amount as due', async ({
        page,
    }) => {
        const breakdown = await openOrder(page, DIGITAL_ORDER_NUMBER);
        await expect(breakdown).toBeVisible();

        await expect(breakdown.getByText('Shipping')).toHaveCount(0);
        await expect(breakdown.getByText('/ due now')).toHaveCount(0);

        const dueLabel = breakdown.getByText('Due now', { exact: true });
        await expect(dueLabel).toBeVisible();
        await expect(dueLabel).toHaveCSS('font-weight', '600');
        await expect(dueLabel.locator('svg')).toHaveCount(1);
    });

    test('shows the shipping line and marks a completed order as paid', async ({
        page,
    }) => {
        const breakdown = await openOrder(page, COMPLETED_ORDER_NUMBER);
        await expect(breakdown).toBeVisible();

        await expect(
            breakdown.getByText('Shipping', { exact: true }),
        ).toBeVisible();
        await expect(breakdown.getByText('Rs. 250')).toBeVisible();

        await expect(breakdown.getByText('due now')).toHaveCount(0);
        await expect(breakdown.getByText('Due now')).toHaveCount(0);

        const paidLabel = breakdown.getByText('Paid', { exact: true });
        await expect(paidLabel).toBeVisible();
        await expect(paidLabel).toHaveCSS('font-weight', '600');
        await expect(paidLabel.locator('svg')).toHaveCount(1);
    });
});
