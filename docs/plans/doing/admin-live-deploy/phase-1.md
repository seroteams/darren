# Phase 1 — Backend live fence

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit 2026-07-12

## ✅ GREEN-LIT 2026-07-12 — Carl walked the local admin (Role words · Meeting arcs · Guide · Test engine all load, nothing forbidden) and said go
Committed path-scoped: the three new files + `auth.controller.ts` whole, and `server.ts` staged hunk-by-hunk to exclude the parallel promises-loop route (that session's uncommitted work left in place). Offline proof re-stated below stands (typecheck clean, 126/126).

## Built (Sat 12 Jul 2026)
- `backend/api/middleware/internal-tool-guard.ts` — `requireInternalToolRoute` (superadmin on live, manager/admin locally; env read per request) + `blockOnLive` (403 for everyone on live).
- `backend/api/middleware/internal-tool-guard.test.ts` — 7 tests, all green (local manager passes / anonymous 401 / live manager 403 / live superadmin passes / per-request env / blockOnLive both ways).
- `backend/api/server.ts` — arcs, role-lexicons, lexicon promotions, heartbeat, regression, checks, suggest-fix, pipeline status, persona-runs, library moved to the new guard; `POST /persona-runs` additionally hard-blocked on live; orphaned `adminV1`/`adminRaw` removed.
- `backend/api/services/auth/auth.controller.ts` — `/auth/me` now returns `appEnv` (server truth); lookup made injectable for tests.
- `backend/api/services/auth/auth.controller.test.ts` — 3 tests green (appEnv local, appEnv live, logged-out 401).
- **Offline proof:** baseline before edits `npm run typecheck` clean + `npm test` 124/124; after edits typecheck clean + **126/126**. Rebooted local dev API: `/auth/me` carries `appEnv:"local"`, heartbeat 200, persona-runs reachable locally. Live-mode behavior proven by the unit tests (env-guard forbids booting APP_ENV=live against the local DB, by design).
- ⚠️ Commit note for phase-close: `backend/api/server.ts` also carries ANOTHER session's uncommitted hunk (a `POST /sessions/:id/promises` route — promises-loop work). Stage my hunks only, or wait for that session to land before committing server.ts.

## Goal
On the live site, internal tooling routes answer only to the superadmin, and the paid Test-engine endpoint is blocked outright — while local dev stays exactly as it is today.

## Changes
- New `backend/api/middleware/internal-tool-guard.ts` (+ mirrored `.test.ts`): `requireInternalToolRoute` — superadmin when the app runs as `live` (via `resolveAppEnv`), the normal manager/admin gate locally.
- `backend/api/server.ts`: the internal-tooling routes (arcs save/reset/list, role-lexicons, lexicon promotions, heartbeat, regression, checks, suggest-fix, pipeline status, persona-runs current, library) move from `adminV1`/`adminRaw` to the new guard. `POST /api/v1/persona-runs` is hard-blocked on live (403 with a plain-words message) — it spends OpenAI money; today any live manager could reach it.
- `backend/api/services/auth/auth.controller.ts` (+ service test): `GET /api/v1/auth/me` also returns `appEnv: "live" | "local"` so the app can adapt its nav later (Phase 2) from server truth, not a build flag.

## Not in this phase
- Serving the admin app on live (Phase 2).
- Any UI change at all — this phase is invisible.

## Done when
- [ ] Unit tests prove: local → manager/admin passes internal routes; live → only superadmin passes; live → persona-runs start is 403 even for superadmin.
- [ ] `/auth/me` returns `appEnv` (test asserts both values).
- [ ] `npm run typecheck` clean, `npm test` no new failures vs the baseline below.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Nothing changed locally** — open your local admin as usual (localhost:3000), edit a Role word, open Meeting arcs, open the Guide. Everything works exactly as before. ❌ Not OK if any screen now says "forbidden".
2. **Test engine still works locally** — open Test engine on local; the screen loads (don't start a paid run — loading the bench list is enough).
3. **The fence itself** — this phase's live behavior can't be walked until Phase 2 deploys; it's proven by the unit tests in "Built" below. Your call here is just: local feels untouched.
