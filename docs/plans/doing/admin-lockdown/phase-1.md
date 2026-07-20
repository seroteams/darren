# Phase 1 — Lock the door

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-20 — Carl walked manager + member bounce and admin-console load on the :3099 prod build

## Built (2026-07-20)
- New guard `backend/api/middleware/admin-shell-guard.ts` (`requireAdminShell`): builds the request identity, serves the admin bundle only to an internal identity (role `admin` OR allowlisted superadmin), 302s everyone else — manager, member, logged-out — to `/`. Fails closed on a session-lookup error.
- Wired in `backend/api/server.ts`: the `/admin` static handler is now fronted by `requireAdminShell`, so the raw file server never sees a non-internal caller.
- Client belt-and-braces + dev parity in `admin/src/main.js` boot: a signed-in non-internal user is full-page redirected out of the admin bundle to `/`.
- Tests: new `admin-shell-guard.test.ts` (5 cases — anon/manager/member 302, admin/superadmin served). Updated `scripts/test-admin-serving.js` to assert the lock end-to-end (was asserting the old open behaviour).
- **Proof:** `npm test` 161/161, `npm run typecheck` clean, `node scripts/test-admin-serving.js` — real prod boot on :3099 confirms logged-out `/admin/` + `/admin/errors` both 302→`/`, customer app at `/` untouched, `/api/v1/admin/*` still JSON 401. Baseline before work: 160/160 + typecheck clean. Internal-admin-served path proven by unit test (needs no DB); a live browser walk of a real manager/superadmin session is Carl's QA below.

## Goal
Nobody but a super-admin can load anything under `/admin` — the server checks who you are before handing over a single file.

## Changes
- `backend/api/server.ts` — the `/admin` static dispatch (currently unguarded at the fallback handler) resolves the session identity first; non-super-admins get a 302 redirect to `/` instead of the bundle. Logged-out visitors likewise.
- `backend/api/static.ts` — stays a pure file server; the gate lives in the dispatch, not here.
- `admin/src/main.js` boot — belt-and-braces + dev parity: a signed-in non-super-admin booting the admin app is redirected to `/` (full page navigation to the customer app), instead of being seated at a manager/member home inside the admin bundle.
- Tests first (TDD): guard unit tests for the new dispatch check; existing suite stays green.

## Not in this phase
- Internal-tool API guard tightening (Phase 2).
- Login/register/email signpost fixes (Phase 3).
- Any slimming of the admin bundle (parked).

## Done when
- [ ] Prod-mode local build: `GET /admin/` with no session, a member session, and a manager session each return a 302 to `/` (verified with real requests, not by reading code).
- [ ] Same build: super-admin session gets the console (200, screens work).
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Manager bounced** — `local (prod build, I'll have it running) > log in as manager@seroteams.com > type /admin in the address bar`. You should land back on the normal app home. ❌ Not OK if the blue admin console shell appears, even for a flash.
2. **Member bounced** — same but logged in as a member account: typing `/admin` lands you on the member home. ❌ Not OK if you see any admin screen.
3. **Logged-out bounced** — open a private/incognito window, go straight to `/admin`. You should land on the public start page at `/`.
4. **Super-admin still in** — log in as your super-admin account, go to `/admin`. Console loads and Pulse works exactly as before.
