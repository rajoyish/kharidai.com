import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './support/storage-state';

/**
 * Captures an authenticated admin session for the rest of the suite to reuse.
 *
 * The app authenticates only through Google OAuth, so there is no login form to
 * drive. Instead we hit `_test/login-as-admin` — a route that only exists in the
 * `testing` environment — and persist the resulting session cookie as storage
 * state, which the `chromium` project loads for every spec.
 *
 * The database this logs into is created and seeded by the `webServer` command
 * in playwright.config.ts, which necessarily runs before this.
 */
setup('authenticate as admin', async ({ page }) => {
    await page.goto('/_test/login-as-admin');
    await page.waitForURL('**/admin');

    mkdirSync(dirname(ADMIN_STORAGE_STATE), { recursive: true });
    await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
