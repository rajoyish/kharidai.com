import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const tableSource = readFileSync(
    resolve(process.cwd(), 'resources/js/components/ui/table.tsx'),
    'utf8',
);
const productsIndexSource = readFileSync(
    resolve(process.cwd(), 'resources/js/pages/Admin/Products/Index.tsx'),
    'utf8',
);
const categoriesIndexSource = readFileSync(
    resolve(process.cwd(), 'resources/js/pages/Admin/Categories/Index.tsx'),
    'utf8',
);

test.describe('table sticky first column', () => {
    test('is enabled by default on the shared table component', () => {
        expect(tableSource).toContain('stickyFirstColumn = true');
        expect(tableSource).toContain('[&_tr>*:first-child]:sticky');
        expect(tableSource).toContain('[&_tr>*:first-child]:left-0');
        expect(tableSource).toContain('[&_tbody_tr>*:first-child]:bg-card');
    });

    for (const viewport of [
        { name: 'desktop', width: 1024, height: 720 },
        { name: 'mobile', width: 390, height: 720 },
    ]) {
        test(`keeps the first column pinned while scrolling on ${viewport.name}`, async ({
            page,
        }) => {
            await page.setViewportSize(viewport);
            await page.setContent(`
                <style>
                    body {
                        margin: 0;
                        padding: 24px;
                    }

                    .table-shell {
                        width: min(100%, 460px);
                        overflow-x: auto;
                        border: 1px solid rgb(229, 231, 235);
                    }

                    table {
                        min-width: 940px;
                        border-collapse: separate;
                        border-spacing: 0;
                        font-family: sans-serif;
                    }

                    th,
                    td {
                        min-width: 180px;
                        padding: 16px;
                        border-bottom: 1px solid rgb(229, 231, 235);
                        background: white;
                        text-align: left;
                    }

                    tr > *:first-child {
                        position: sticky;
                        left: 0;
                        z-index: 10;
                        border-right: 1px solid rgb(229, 231, 235);
                        background: white;
                        box-shadow: 8px 0 12px -12px rgba(0, 0, 0, 0.45);
                    }

                    thead tr > *:first-child {
                        z-index: 20;
                        background: rgb(243, 244, 246);
                    }
                </style>
                <div class="table-shell" data-testid="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td data-testid="first-cell">KH-1001</td>
                                <td data-testid="second-cell">June 29, 2026</td>
                                <td>Rajoyish Rai</td>
                                <td>Rs. 4,500</td>
                                <td>Completed</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `);

            const shell = page.getByTestId('table-shell');
            const firstCell = page.getByTestId('first-cell');
            const secondCell = page.getByTestId('second-cell');
            const initialFirstCellBox = await firstCell.boundingBox();
            const initialSecondCellBox = await secondCell.boundingBox();

            await shell.evaluate((element) => {
                element.scrollLeft = 360;
            });

            await expect
                .poll(async () =>
                    shell.evaluate((element) => element.scrollLeft),
                )
                .toBeGreaterThan(0);

            const scrolledFirstCellBox = await firstCell.boundingBox();
            const scrolledSecondCellBox = await secondCell.boundingBox();
            const stickyStyles = await firstCell.evaluate((element) => {
                const styles = getComputedStyle(element);

                return {
                    backgroundColor: styles.backgroundColor,
                    left: styles.left,
                    position: styles.position,
                    zIndex: styles.zIndex,
                };
            });

            expect(initialFirstCellBox).not.toBeNull();
            expect(initialSecondCellBox).not.toBeNull();
            expect(scrolledFirstCellBox).not.toBeNull();
            expect(scrolledSecondCellBox).not.toBeNull();

            expect(scrolledFirstCellBox!.x).toBeCloseTo(
                initialFirstCellBox!.x,
                0,
            );
            expect(scrolledSecondCellBox!.x).toBeLessThan(
                initialSecondCellBox!.x - 300,
            );
            expect(scrolledSecondCellBox!.x).toBeLessThan(
                scrolledFirstCellBox!.x + scrolledFirstCellBox!.width,
            );
            expect(stickyStyles).toEqual({
                backgroundColor: 'rgb(255, 255, 255)',
                left: '0px',
                position: 'sticky',
                zIndex: '10',
            });
        });
    }
});

test.describe('admin table sticky overrides', () => {
    test('keeps product images sticky and disables category stickiness', () => {
        expect(productsIndexSource).toContain('PRODUCT_IMAGE_COLUMN_CLASSES');
        expect(productsIndexSource).not.toContain(
            'PRODUCT_TITLE_STICKY_CELL_CLASSES',
        );
        expect(productsIndexSource).not.toContain('sticky left-[88px]');
        expect(categoriesIndexSource).toContain('stickyFirstColumn={false}');
        expect(categoriesIndexSource).not.toContain(
            'CATEGORY_NAME_STICKY_CELL_CLASSES',
        );
    });

    test('links products to storefront pages in a new tab', () => {
        expect(productsIndexSource).toContain('showStorefrontProduct.url');
        expect(productsIndexSource).toContain('target="_blank"');
        expect(productsIndexSource).toContain('rel="noopener noreferrer"');
    });

    for (const viewport of [
        { name: 'desktop', width: 1024, height: 720 },
        { name: 'mobile', width: 390, height: 720 },
    ]) {
        test(`lets long product titles scroll while the image stays pinned on ${viewport.name}`, async ({
            page,
        }) => {
            await page.setViewportSize(viewport);
            await page.setContent(`
                <style>
                    body {
                        margin: 0;
                        padding: 24px;
                    }

                    .table-shell {
                        width: min(100%, 460px);
                        overflow-x: auto;
                        border: 1px solid rgb(229, 231, 235);
                    }

                    table {
                        min-width: 1060px;
                        border-collapse: separate;
                        border-spacing: 0;
                        font-family: sans-serif;
                    }

                    th,
                    td {
                        min-width: 180px;
                        padding: 16px;
                        border-bottom: 1px solid rgb(229, 231, 235);
                        background: white;
                        text-align: left;
                    }

                    tr > *:first-child {
                        position: sticky;
                        left: 0;
                        z-index: 10;
                        width: 88px;
                        min-width: 88px;
                        max-width: 88px;
                        padding-inline: 16px;
                        border-right: 1px solid rgb(229, 231, 235);
                        background: white;
                        box-shadow: 8px 0 12px -12px rgba(0, 0, 0, 0.45);
                    }

                    thead tr > *:first-child {
                        z-index: 20;
                        background: rgb(243, 244, 246);
                    }
                </style>
                <div class="table-shell" data-testid="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td data-testid="first-cell">IMG</td>
                                <td data-testid="second-cell">A very long product name that should scroll on mobile</td>
                                <td data-testid="third-cell">Subscriptions</td>
                                <td>In Stock</td>
                                <td>Edit</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `);

            const shell = page.getByTestId('table-shell');
            const firstCell = page.getByTestId('first-cell');
            const secondCell = page.getByTestId('second-cell');
            const thirdCell = page.getByTestId('third-cell');
            const initialFirstCellBox = await firstCell.boundingBox();
            const initialSecondCellBox = await secondCell.boundingBox();

            await shell.evaluate((element) => {
                element.scrollLeft = 420;
            });

            await expect
                .poll(async () =>
                    shell.evaluate((element) => element.scrollLeft),
                )
                .toBeGreaterThan(0);

            const scrolledFirstCellBox = await firstCell.boundingBox();
            const scrolledSecondCellBox = await secondCell.boundingBox();
            const scrolledThirdCellBox = await thirdCell.boundingBox();
            const firstColumnStyles = await firstCell.evaluate((element) => {
                const styles = getComputedStyle(element);

                return {
                    backgroundColor: styles.backgroundColor,
                    left: styles.left,
                    position: styles.position,
                    zIndex: styles.zIndex,
                };
            });

            expect(initialFirstCellBox).not.toBeNull();
            expect(initialSecondCellBox).not.toBeNull();
            expect(scrolledFirstCellBox).not.toBeNull();
            expect(scrolledSecondCellBox).not.toBeNull();
            expect(scrolledThirdCellBox).not.toBeNull();

            expect(scrolledFirstCellBox!.x).toBeCloseTo(
                initialFirstCellBox!.x,
                0,
            );
            expect(scrolledSecondCellBox!.x).toBeLessThan(
                initialSecondCellBox!.x - 360,
            );
            expect(scrolledSecondCellBox!.x).toBeLessThan(
                scrolledFirstCellBox!.x + scrolledFirstCellBox!.width,
            );
            expect(scrolledThirdCellBox!.x).toBeGreaterThan(
                scrolledSecondCellBox!.x,
            );
            expect(firstColumnStyles).toEqual({
                backgroundColor: 'rgb(255, 255, 255)',
                left: '0px',
                position: 'sticky',
                zIndex: '10',
            });
        });
    }
});
