# Phase 7 — one shared boot module for both app shells

**Built 2026-07-25 (session 17d7a976). Awaiting Carl's green light.**

Goal: the admin and customer entry files reimplemented the same shell machinery — mount the chrome, render one stage at a time, recover from a stale-chunk import, keep the URL in step, rehydrate a live session — and had already drifted three ways. One shared module; the real differences become visible configuration.

## What landed

- **New [admin/src/boot-shell.js](../../../admin/src/boot-shell.js)** (208 lines): `startShell()` mounts the standing chrome (build stamp, session topbar, nav, profile badge, notes panel, dev badge) and owns the render loop — `renderStage` / `enqueueRender` / stale-chunk recovery / the store subscription that syncs the URL — plus the shared `rehydrateById` and `defaultSubstage`.
- **Both entries switched**, admin first then customer, each verified before moving on. Between them `main.js` shed **308 lines** (+24 added).
- **The divergences are now parameters, not drift:** `loaders` (the stage map — the whole point of the split), `syncUrl` (each app has its OWN router with different rules), `fadeStages` (admin cross-dissolves; customer doesn't), `mountDeps` (admin passes the regression refresher). `appNav` + `profileBadge` are passed in as instances since each app builds its own.
- **Deliberately NOT shared:** each app's `boot()` gate and `popstate` rules. Those genuinely differ (admin is internal-only and bounces managers out; customer has a guest lane and a member home) — merging them would invent behaviour rather than remove duplication.

**Caught in the build:** the first draft imported `syncUrl` from the admin router inside the shared module — which would have silently given the customer app the ADMIN app's URL rules. Fixed to an injected parameter before either app was switched.

## Verification (all free)

- **Real servers, real browser** (own ports 3231/3233/3235, so no clash with the other live session): both apps booted, and I clicked through a screen change in each.
  - [proof/p7-admin-first-paint.png](proof/p7-admin-first-paint.png) — admin boots to Pulse with full chrome and real data.
  - [proof/p7-customer-first-paint.png](proof/p7-customer-first-paint.png) — customer boots to its Home.
  - [proof/p7-admin-nav.png](proof/p7-admin-nav.png) + [proof/p7-customer-nav.png](proof/p7-customer-nav.png) — Library / Team open, URL updates, nav highlight follows: the shared render loop swapping stages.
  - **Zero console errors** on both apps while the servers were live. (Errors appear in the log only after I stopped the servers — the page losing its dev server, not the app.)
- `npm run build:all`, both app typechecks, `npm test` — **186/186**. (Two transient dips to 184–185 mid-phase were a parallel session writing its Google sign-in and time.ts changes; the count rose as they added tests, and all pass now.)

## QA — what Carl checks

1. Look at the four screenshots: both apps look exactly as they did, and navigating works.
2. Optional 60-second walk: `local > either app > click two nav items` — screens should swap normally.
3. ✅ Pass: nothing looks different. ❌ Fail: any boot or navigation oddity — say which app.
