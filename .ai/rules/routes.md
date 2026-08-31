---
paths:
  - 'resources/js/routes/**'
---

# Routes

## Regenerate Wayfinder with --with-form
`vite.config.ts` configures the Wayfinder plugin with `formVariants: true`, but the artisan command defaults to off. Running plain `php artisan wayfinder:generate` silently strips every `.form` variant and breaks `npm run types:check` in unrelated files (settings pages, notification pages, delete-user).

Always run `php artisan wayfinder:generate --with-form`.
