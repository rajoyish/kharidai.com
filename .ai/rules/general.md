---
paths:
  - vite.config.ts
---

# General

## Keep ssr.noExternal true so the SSR bundle is self-contained
`bootstrap/ssr/ssr.js` must carry every dependency it needs. Vite externalises anything listed in package.json `dependencies`, and the deploy never ships `node_modules` to the shared host, so an externalised import is a package Node cannot resolve: the process exits with ERR_MODULE_NOT_FOUND on startup, cron restarts it into the same crash, and Inertia silently serves every page client-side.

Nothing fails the build when this breaks. Adding one package to `dependencies` is enough to take SSR down with a green deploy.

To verify a bundle is self-contained, copy `bootstrap/ssr/ssr.js` and `bootstrap/ssr/assets` into an empty directory with no `node_modules`, add `{"type":"module"}` as package.json, run it, and check `/health` answers.
