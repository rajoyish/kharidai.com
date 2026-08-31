---
name: ssr-shared-hosting
description: "Explains how Inertia SSR runs on this app's cPanel shared hosting. Activates when working on server-side rendering, hydration mismatches (React error #418/#423/#425), resources/js/ssr.tsx, bootstrap/ssr/ssr.js, vite.config.ts ssr options, scripts/ssr-server.sh, scripts/scheduler.sh, the deploy workflow, the SSR cron job, or the cPanel Node.js app; when a page silently drops to client-side rendering; when the SSR process will not stay up or Node reports ERR_MODULE_NOT_FOUND; when a file or setting on the server disappears after a deploy; or when the user mentions SSR, hydration, Passenger, shared hosting, node_modules on the server, or 'no node in the terminal'."
---

# Inertia SSR on cPanel Shared Hosting

## The shape of this setup

SSR runs as a **plain detached Node process**, not under cPanel's Node.js app manager,
and **nothing is ever built or installed on the server**. Three pieces:

| Piece | File | Role |
| --- | --- | --- |
| Process manager | `scripts/ssr-server.sh` | start / stop / restart / ensure / status |
| Deploy | `.github/workflows/deploy.yml` | builds the bundle in CI, rsyncs it, restarts SSR |
| Keep-alive | cron → `scripts/ssr-server.sh ensure` | restarts the process if its health check fails |

Laravel reaches the process over loopback at `127.0.0.1:13714`
(`config/inertia.php` → `inertia.ssr.url`, overridable via `INERTIA_SSR_URL`).
The bundle it runs is `bootstrap/ssr/ssr.js`.

## What the server has to provide

Everything below lives on the server and is **not** restored by a deploy. If SSR
breaks after a host migration, a plan change, or a support ticket, check these
first.

| Requirement | Where it lives | How to verify |
| --- | --- | --- |
| A Node binary | `~/nodevenv/<domain>/<major>/bin/node` (a shim for `/opt/alt/alt-nodejs*/root/usr/bin/node`) | `bash scripts/ssr-server.sh status` |
| SSR keep-alive cron, every 2 min | cPanel → Cron Jobs | `tail storage/logs/ssr-cron.log` |
| Scheduler cron, every 1 min | cPanel → Cron Jobs | `tail storage/logs/scheduler-cron.log` |
| Redis, if sessions or cache use it | cPanel cron holding `redis-server` open under `flock` | `php artisan tinker --execute 'Redis::set("p","ok"); echo Redis::get("p");'` |
| `.env` | app root, excluded from rsync | `php artisan env` |
| Free loopback port 13714 | n/a | `curl -sS -m 5 http://127.0.0.1:13714/health` |

Both cron entries must set the interpreter themselves, because cPanel cron gets a
minimal `PATH`:

```
*/2 * * * *  NODE_BIN=/home/<user>/<app>/…/bin/node /bin/bash /home/<user>/<app>/scripts/ssr-server.sh ensure >> …/storage/logs/ssr-cron.log 2>&1
*   * * * *  PHP_BIN=/usr/local/bin/php /bin/bash /home/<user>/<app>/scripts/scheduler.sh >/dev/null 2>> …/storage/logs/scheduler-cron.log
```

The process sits at roughly **115-130 MB RSS**. That is normal for a bundle
carrying its own dependencies, and it is the number to check against the
account's memory limit if the host starts killing it.

## Rules that are easy to get wrong

**The SSR bundle has to be self-contained.** `vite.config.ts` sets
`ssr: { noExternal: true }` and it must stay that way. Vite externalises anything
listed in `package.json` `dependencies`, and the deploy never ships
`node_modules`, so an externalised import is a package Node cannot resolve: the
process exits with `ERR_MODULE_NOT_FOUND` on startup, cron restarts it into the
same crash every two minutes, and Inertia serves every page client-side. Nothing
fails the build when this breaks, so adding one package to `dependencies` is
enough to take SSR down with a green deploy.

This once survived on a stale `node_modules` left behind by an old cPanel Node.js
app, which masked ~50 externalised imports until a new dependency was not in that
tree. Do not fix a resolution error by installing packages on the server. Fix the
bundle.

**The deploy deletes anything that is not in the repo.** rsync runs with
`--delete`, so the server is a mirror of the CI workspace. Only these survive:

```
.git   .github   .env   node_modules   tests   storage/
```

A script, config file, or patch placed on the server by hand and living anywhere
else is removed on the next push to `main`, and whatever pointed at it starts
failing silently. Commit it to the repo, or keep it outside the app root. Cron
entries themselves are safe: they live in cPanel, not in the app directory.

**Never tell the user to run `npm` on the server.** `npm run build:ssr` runs on
the **GitHub runner**, and rsync ships the result. `bootstrap/ssr` and
`public/build` are gitignored, but rsync copies the CI *workspace* rather than the
git index, so the freshly built bundle deploys anyway. This is deliberate, do not
"fix" it by committing the bundle or by adding an exclude.

**The cPanel Node.js app must stay stopped.** Passenger patches
`net.Server.prototype.listen` and rebinds the server to a Unix socket it owns, so
a Passenger-managed process is never reachable on `127.0.0.1:13714` and PHP's SSR
gateway gets connection refused. A "stopped" Node.js app in cPanel is the correct
state, not a bug to report.

**Locate interpreters explicitly.** cPanel cron and SSH sessions get a minimal
`PATH`. Both scripts resolve their interpreter themselves. `ssr-server.sh` probes
`/opt/cpanel/ea-nodejs*/bin/node` and `~/nodevenv/*/*/bin/node` (override with
`NODE_BIN`); `scheduler.sh` does the same for `php` (override with `PHP_BIN`).
Never assume a bare `node` or `php` is on the path.

**A restart is part of every deploy.** The SSR process is long-lived and holds the
old bundle in memory, so shipping a new bundle without `ssr-server.sh restart`
keeps serving stale renders.

**The env var is `INERTIA_SSR_ENABLED`, not `SSR_ENABLED`.** `config/inertia.php`
reads the former and defaults to `true`. A misspelled entry in `.env` is not an
error, it is simply never read, so it looks like it is controlling something while
the default quietly decides.

**Never end a cache-warming chain with a clear.** `optimize:clear` and
`config:clear` wipe the config, route, view and event caches, so putting either
after `config:cache` leaves the app fully uncached and slower on every request.
Use `composer dump-autoload -o && php artisan optimize`, and stop there.

## Failures are silent by design

A throw inside a React component during SSR does **not** fail the request. Inertia
catches it and quietly falls back to client-side rendering: the route still answers
200, but ships an empty root and no indexable content. Status codes and `<head>`
tags prove nothing, because `app.blade.php` renders the SEO meta itself and
survives a failed render.

The only marker of a successful server render is the attribute Inertia stamps on
the root element:

```
data-server-rendered="true"     # rendered on the server
<div id="app"></div>            # empty root — SSR failed, silently fell back to CSR
```

Inertia dispatches `SsrRenderFailed` on every failure and ships no listener, so
`App\Listeners\LogSsrRenderFailure` exists to write it to the log. It is
registered explicitly in `AppServiceProvider` rather than left to event discovery
so it survives `event:cache`, and it is throttled to one line per five minutes per
component because a broken SSR fails on every request and would otherwise bury the
disk. Its `type` field is the first thing to read: `connection` means PHP never
reached the process, anything else means the render itself threw.

`tests/Feature/SsrGuestRenderTest.php` pins the rendered marker against the real
bundle over a real Node process (and skips when the bundle is not built). Add a
case there for any new guest-reachable route.

## Diagnosing SSR that is down

From outside, one line says whether SSR is working at all:

```bash
curl -s https://<domain>/ | grep -c 'data-server-rendered'   # 1 = working, 0 = down
```

On the server, in order:

```bash
cd ~/<app>
grep -a "SSR render failed" storage/logs/laravel.log | tail -5   # why PHP thinks it failed
php artisan inertia:check-ssr
curl -sS -m 5 http://127.0.0.1:13714/health; echo
bash scripts/ssr-server.sh status
tail -40 storage/logs/ssr.log                                    # why Node died
tail -20 storage/logs/ssr-cron.log                               # is cron restarting it in a loop
ps -o pid,rss,etime,cmd -u $(whoami) | grep '[n]ode'
```

`etime` is the tell. A value under the cron interval, on every check, means the
process is crash-looping rather than running: cron starts it, it dies, cron starts
it again. `storage/logs/ssr.log` holds the reason. An `etime` comfortably past one
cron tick means it is genuinely up.

Two things that look like faults and are not:

- **`crontab -l` returns nothing** even though cPanel lists the jobs. The shell
  runs inside CageFS, which does not expose `/var/spool/cron/<user>`. Timestamps
  arriving on schedule in `storage/logs/ssr-cron.log` are the proof that cron
  fires. Manage the entries in cPanel, not the shell.
- **`storage/logs/ssr.log` is enormous.** A crash loop writes a stack trace every
  two minutes, which reached 34 MB in one incident. Truncate with
  `: > storage/logs/ssr.log` after fixing the cause.

## Edge-caching guest pages

The origin renders a full SSR page in ~0.4s, but the hop between the CDN edge and
this host has been measured adding 3-4 seconds on top, worsening under
concurrency. `CacheGuestPagesAtEdge` lets the CDN answer anonymous storefront
requests so most visitors never make that trip.

**It is off by default and must stay off until the CDN rule exists.**
`EDGE_CACHE_GUEST_PAGES=true` alone, with no matching rule, is how one shopper
ends up looking at another shopper's page.

The middleware only marks a response public when the request is a guest GET on a
route in its `CACHEABLE_ROUTES` list, carries no session cookie, and is not an
Inertia XHR. It then strips `Set-Cookie`, because a CDN told to cache a body
stores the cookies with it and hands the same session to everyone who asks.

It is registered with `web(prepend:)`, not `append:`. An appended middleware is
the innermost one, so its work on the way out runs *before*
`AddQueuedCookiesToResponse` puts the cookies back.

The Cloudflare Cache Rule to pair with it:

```
If   (starts_with(http.request.uri.path, "/products/") or
      starts_with(http.request.uri.path, "/categories/") or
      http.request.uri.path in {"/" "/digital-products" "/physical-products" "/services" "/blog"})
     and not http.request.headers.cookie contains "kharidai-session"
     and http.request.method eq "GET"
Then Cache eligibility: Eligible for cache
     Edge TTL: Use cache-control header from origin
     Browser TTL: Respect origin
```

The cookie condition is the safety net: even if the origin ever marks something
public by mistake, a request carrying a session bypasses the cache entirely.

Nothing purges the edge when an admin edits a product, so `EDGE_CACHE_TTL`
doubles as the worst-case delay before an edit is visible to a logged-out
visitor.

**CSRF depends on the priming route.** A cached page carries no `XSRF-TOKEN`, so
a first-time visitor's first write would be rejected with a 419.
`resources/js/lib/csrf.ts` registers an `http.onRequest` interceptor that fetches
`GET /csrf-cookie` when the cookie is missing and sets the header from it.
Removing either half breaks login and add-to-cart for every visitor who arrived
on a cached page, and only for them, which makes it easy to miss.

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

**Delete `public/hot` first.** A leftover from a `npm run dev` session makes
`Vite::isRunningHot()` true, so the SSR gateway posts to the Vite dev server
instead of the bundle. Every page then falls back to CSR and
`SsrGuestRenderTest` fails wholesale, which looks exactly like a broken bundle.

To reproduce the server's conditions and prove the bundle needs no `node_modules`:

```bash
mkdir /tmp/ssrcheck && cd /tmp/ssrcheck
cp -r <app>/bootstrap/ssr/ssr.js <app>/bootstrap/ssr/assets .
echo '{"type":"module"}' > package.json
PORT=13799 node ssr.js &
curl -sS -m 5 http://127.0.0.1:13799/health   # must answer {"status":"OK",…}
```

An `ERR_MODULE_NOT_FOUND` here is the same failure the server would hit, caught
before it ships.
