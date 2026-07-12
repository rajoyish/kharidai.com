import { defineConfig, devices } from '@playwright/test';
import { PLAYWRIGHT_ENV } from './tests/browser/support/env';
import { ADMIN_STORAGE_STATE } from './tests/browser/support/storage-state';

export default defineConfig({
  testDir: './tests/browser',
  // The specs share one sqlite database and some of them mutate it, so they run
  // serially rather than in parallel.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],

  // Serves the app against a throwaway sqlite database so that destructive
  // specs never touch local development data.
  //
  // The database is created and seeded here rather than in the setup project,
  // because the app cannot answer Playwright's health check until it has a
  // migrated database to talk to.
  //
  // `reuseExistingServer` is off on purpose: an `artisan serve` you already had
  // running would be pointed at the development database, and the delete specs
  // would happily destroy real data.
  webServer: {
    command: [
      // .env.testing is gitignored (it holds a key), so bootstrap it from the
      // committed template on first run. APP_ENV=testing makes both commands
      // below target .env.testing rather than .env.
      '([ -f .env.testing ] || (cp .env.testing.example .env.testing && php artisan key:generate --force))',
      'touch database/database.sqlite',
      "php artisan migrate:fresh --seed --seeder='Database\\Seeders\\PlaywrightSeeder' --force",
      'php artisan serve',
    ].join(' && '),
    url: 'http://localhost:8000',
    // Merged, not replaced: `webServer.env` overrides `process.env` wholesale,
    // and dropping PATH means `php` cannot be found.
    env: { ...process.env, ...PLAYWRIGHT_ENV },
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
