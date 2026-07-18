# Phase 2 — Admin app served at /admin on live

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT 2026-07-18

## Goal
Carl opens `https://sero-obwq.onrender.com/admin` on his phone, logs in as carl@seroteams.com, and the admin console works — while the customer app at `/` is untouched.

## Changes
- `vite.config.js` (admin build): `base: "/admin/"` in dev AND build.
- `admin/src/router.js`: base-aware URL helpers (`withBase`/`stripBase`/`replaceUrl`); strip the base in `parseLocation()`, prefix in `syncUrl()`.
- `admin/src/main.js`: the 6 hardcoded `history.replaceState(..., "/...")` calls go through the new `replaceUrl` helper.
- `admin/src/state.js` + `admin/src/ui/app-nav.js`: stash `appEnv` from `/auth/me`; on live, hide Test engine and Tasks from the nav and bounce their deep links.
- `backend/api/static.ts`: optional `{ prefix }` on `createStaticHandler` (+ `X-Robots-Tag: noindex` for the admin dist).
- `backend/api/server.ts`: mount `admin/dist` at `/admin` in the prod fallback; update the stale "admin never ships" comment.
- `package.json`: `build:all` (admin + customer); `render.yaml` buildCommand uses it.
- New `scripts/test-admin-serving.js`: admin dist ships no secrets; prod boot serves `/admin/` → admin entry, `/` → customer entry, deep links fall back to the right index, logged-out `/api/v1/admin/*` answers JSON 401.

## Manual step (Carl, with my walkthrough)
1. In the Render dashboard, check `SUPERADMIN_EMAILS` = `carl@seroteams.com`.
2. Register carl@seroteams.com on the live site (normal register form).

## Not in this phase
- The Pulse dashboard (Phase 3) — on live you land on the existing screens (User management etc.).

## Done when
- [ ] `scripts/test-admin-serving.js` green alongside the untouched `test-customer-serving.js`.
- [ ] Local dev at `localhost:3000/admin/` works end-to-end (login → screens → reload on a deep link).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Phone login** — on your phone open `https://sero-obwq.onrender.com/admin`. Log in as carl@seroteams.com. You land in the admin console; User management, Error log, Guest runs, Feedback inbox all load. ❌ Not OK if you see the customer app or a 404.
2. **Deep link reload** — inside the admin, go to Error log, then pull-to-refresh / reload. You stay on the Error log. ❌ Not OK if reload dumps you at the customer app.
3. **Live nav is trimmed** — the sidebar has no Test engine and no Tasks on live.
4. **Customer app untouched** — open `https://sero-obwq.onrender.com/` (no /admin): the normal customer app, exactly as before.
5. **Local untouched-ish** — local admin now lives at `localhost:3000/admin/` (bookmark change, one time). Everything else identical, Test engine visible locally.

## ✅ GREEN-LIT 2026-07-18

Carl walked the whole system ("I've just been through the system and they look fine") and green-lit every built pass in one sweep (goodnight close-out).
