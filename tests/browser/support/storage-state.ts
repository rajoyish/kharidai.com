/**
 * Where the authenticated admin session captured by `auth.setup.ts` is written.
 *
 * This lives in its own module because `playwright.config.ts` needs the path
 * too, and importing it from the setup spec would pull a `test()` call into the
 * config, which Playwright rejects.
 */
export const ADMIN_STORAGE_STATE = 'tests/browser/.auth/admin.json';
