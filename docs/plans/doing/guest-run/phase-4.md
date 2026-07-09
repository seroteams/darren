# Phase 4 — Superadmin "Guest runs" screen

**Part of:** [PLAN.md](plan.md) · **Status:** 🔨 built 2026-07-09 — awaiting Carl's walk ($0)

## Build record (2026-07-09, $0)
Test-first: 2 new mirrored service tests (red→green) — `guestRuns()` newest-first passthrough +
empty-safe. Whole tree after: `npm test` 103/103 (files) · both typechecks clean. Live-proven free
on a scratch API+web pair (:3081/:3085): route walls — superadmin 200 · manager **403** ·
anonymous **401**; the rail shows **Guest runs** next to Error log for the superadmin only; a
manager's rail has no row and the `/admin/guests` deep link bounces to home; the screen renders
and the read-only briefing reuses the proven PG8 drilldown route. File-mode list proven on real
disk data: 19 ownerless finished runs, newest first, the unfinished parked guest run correctly
excluded.
⚠️ **Know before you walk:** with a database configured (your machine), the list reads from
Postgres (the read cutover) — old disk-only guest runs (the 19) will NOT show until the
postgres-runtime-data import phase (P6) lands. The list fills from NEW guest runs (dual-written).
So today you'll see the honest empty state unless a fresh guest run has finished — scenario 1's
"you see the pile" fully lights up after P6 or the first real guest.

## Goal
Carl can see every unclaimed guest run in one superadmin screen and open each briefing read-only — guest runs are alpha feedback gold, not invisible files on disk.

## Changes
- `backend/engine/run-history.ts`: `listOwnerlessFinishedRuns()` — unfenced `walkRuns()`, filter briefing-complete + no `userId`/`orgId`, newest first.
- `backend/api/services/superadmin/`: repo `listGuestRuns()` → service `guestRuns()` (+ mirrored test) → controller → `GET /api/v1/admin/guest-runs` via `superadminV1` in `server.ts`.
- Detail view: reuse the existing `GET /api/v1/admin/runs/:id` (`superadminRunView` already serves ownerless runs) + `renderReadonlyBriefing`.
- Frontend: **new** `admin/src/stages/admin-guest-runs.ts` mirroring `admin-user-detail.ts`; `STAGES.ADMIN_GUEST_RUNS`, route `/admin/guests` (ADMIN_ONLY), loader in `main.js`, `superadmin: true` nav row next to Error log; `shared/api.js` getter.

## Not in this phase
- Expiry/cleanup, claim-from-admin, filtering old QA runs out of the list (copy tweak parked).

## Done when
- [ ] Test first: service returns ownerless-only, newest-first, from a fake repo.
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
All free, in the browser. Next phase = close-out.

1. **You see the guest pile** — logged in as you (superadmin), a **Guest runs** item sits in the rail near Error log. Open it: a list of ownerless finished runs, newest first. The run you claimed in Phase 3 is NOT in the list (it's owned now). ❌ Not OK if claimed runs still show, or the item is missing.
2. **You can read a guest briefing** — click a guest run: the briefing opens read-only, same look as the admin user drilldown. ❌ Not OK if it's editable or errors.
3. **Only you** — logged in as a normal manager, there is no Guest runs item, and going to `/admin/guests` directly refuses (bounced/403). ❌ Not OK if a manager can see it.
