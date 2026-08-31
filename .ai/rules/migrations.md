---
paths:
  - 'database/migrations/**'
---

# Migrations

## Name long indexes explicitly (dev is MySQL, tests are SQLite)
The test suite runs on SQLite but the dev/production database is MySQL, which rejects index names longer than 64 characters. SQLite does not, so a migration with a long auto-generated index name passes the whole suite and then fails on `php artisan migrate`.

Pass an explicit short name whenever the table plus column names would exceed 64 chars, e.g. `$table->unique(['monthly_tithe_id', 'service_engagement_id'], 'tithe_items_service_unique');`

Always run `php artisan migrate` against the dev database before calling a migration done. Green tests are not proof it works.
