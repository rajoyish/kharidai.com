---
name: ssr-shared-hosting
description: "Explains how Inertia SSR runs on this app's cPanel shared hosting. Activates when working on server-side rendering, hydration mismatches (React error #418/#423/#425), resources/js/ssr.tsx, bootstrap/ssr/ssr.js, scripts/ssr-server.sh, the deploy workflow, the SSR cron job, or the cPanel Node.js app; when a page silently drops to client-side rendering; or when the user mentions SSR, hydration, Passenger, shared hosting, or 'no node in the terminal'."
---

# Inertia SSR on cPanel Shared Hosting

## The shape of this setup

SSR runs as a **plain detached Node process**, not under cPanel's Node.js app manager,
and **nothing is ever built on the server**. Three pieces:

| Piece | File | Role |
| --- | --- | --- |
| Process manager | `scripts/ssr-server.sh` | start / stop / restart / ensure / status |
| Deploy | `.github/workflows/deploy.yml` | builds the bundle in CI, rsyncs it, restarts SSR |
| Keep-alive | cron → `scripts/ssr-server.sh ensure` | restarts the process if its health check fails |

Laravel reaches the process over loopback at `127.0.0.1:13714`
(`config/inertia.php` → `inertia.ssr.url`, overridable via `INERTIA_SSR_URL`).
The bundle it runs is `bootstrap/ssr/ssr.js`.

## Rules that are easy to get wrong

**Never tell the user to run `npm` on the server.** The shared host has no `node`
on the terminal's `PATH`. `npm run build:ssr` runs on the **GitHub runner**, and
rsync ships the result. `bootstrap/ssr` and `public/build` are gitignored, but
rsync copies the CI *workspace* rather than the git index, so the freshly built
bundle deploys anyway — this is deliberate, do not "fix" it by committing the
bundle or by adding an exclude.

**The cPanel Node.js app must stay stopped.** Passenger patches
`net.Server.prototype.listen` and rebinds the server to a Unix socket it owns, so
a Passenger-managed process is never reachable on `127.0.0.1:13714` and PHP's SSR
gateway gets connection refused. A "stopped" Node.js app in cPanel is the correct
state, not a bug to report.

**Locate interpreters explicitly.** cPanel cron and SSH sessions get a minimal
`PATH`. Both scripts resolve their interpreter themselves — `ssr-server.sh` probes
`/opt/cpanel/ea-nodejs*/bin/node` and `~/nodevenv/*/*/bin/node` (override with
`NODE_BIN`); `scheduler.sh` does the same for `php` (override with `PHP_BIN`).
Never assume a bare `node` or `php` is on the path.

**A restart is part of every deploy.** The SSR process is long-lived and holds the
old bundle in memory, so shipping a new bundle without `ssr-server.sh restart`
keeps serving stale renders.

## Failures are silent by design

A throw inside a React component during SSR does **not** fail the request. Inertia
catches it and quietly falls back to client-side rendering: the route still answers
200, but ships an empty root and no indexable content. Status codes and `<head>`
tags prove nothing — `app.blade.php` renders the SEO meta itself and survives a
failed render.

The only marker of a successful server render is the attribute Inertia stamps on
the root element:

```
data-server-rendered="true"     # rendered on the server
<div id="app"></div>            # empty root — SSR failed, silently fell back to CSR
```

`tests/Feature/SsrGuestRenderTest.php` pins this against the real bundle over a real
Node process (and skips when the bundle is not built). Add a case there for any new
guest-reachable route.

## The hydration invariant

**`resources/js/ssr.tsx` and `resources/js/app.tsx` must render the same tree.**
The client tree may only differ in ways that produce no DOM on the first render.

`app.tsx` mounts providers plus `<App />` **and `<Toaster />`** inside the hydration
root, so `ssr.tsx` must mount them too. Sonner renders an empty landmark
`<section aria-label="Notifications …">` even with zero toasts pending — it only
uses `toasts.length` for stacking — so omitting it server-side made the client's
first render one node longer than the markup it hydrated. React rejects that: it
throws **error #418** and re-renders the whole page from scratch, discarding the
server-rendered DOM on *every* route. SSR was being paid for and thrown away.

When adding anything to one entry's `setup()`, add it to the other, or convince
yourself it renders `null` on the client's first pass.

Hooks that read browser-only state are fine **if** they go through
`useSyncExternalStore` with a server snapshot — `use-appearance.tsx` and
`use-mobile.tsx` already do. `useEffect` is also safe (it does not run on the
server). What is *not* safe is branching on `window`/`localStorage`/`Date.now()`
during render.

## Diagnosing a hydration mismatch

Production React errors are minified; `#418` means "server rendered HTML didn't
match the client". To find the offending node, diff the two trees with Playwright
(already a dev dependency) rather than guessing:

1. Load the page with `javaScriptEnabled: false` and read
   `document.getElementById('app').innerHTML` — that is the **server** tree.
2. Load it normally, wait for `networkidle`, and read the same — that is the
   **client** tree (React regenerates it after a mismatch).
3. Diff the two. The first divergence is the bug.

If the trees are identical but React still complains, check for **invalid HTML
nesting** (`<div>` inside `<p>`, nested `<a>`): the browser's parser silently
restructures it, so hydration walks a DOM that no longer matches the markup. Detect
that by comparing the raw served HTML against the parsed DOM with JS disabled.

## Local verification

The dev machine has Node, so SSR can be exercised for real:

```bash
npm run build:ssr                 # client bundle + bootstrap/ssr/ssr.js
php artisan inertia:start-ssr     # the SSR process
php artisan serve                 # the app
php artisan test --compact tests/Feature/SsrGuestRenderTest.php
```

Then load a page and confirm the console is clean. Note `phpunit.xml` disables SSR
for the suite; `SsrGuestRenderTest` opts itself back in.
