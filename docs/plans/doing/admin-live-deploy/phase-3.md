# Phase 3 — Pulse dashboard

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Logging in at /admin on live lands Carl on one phone-first Pulse screen: the Gate-1 number, managers, runs (with type mix), sparkline, drop-offs, guests, latest feedback, errors — matching the walked mock on the Tests page.

## Changes
- `backend/api/services/superadmin/superadmin.repo.ts`: new reads — runs-per-day (14d), run-type mix (7d, from `sessions.meeting_type`), unfinished-by-stage (14d), guest-run count, error/feedback counts.
- `backend/api/services/superadmin/superadmin.service.ts`: `pulse()` folding those + the existing `listRegistered` summary into one payload (+ mirrored test with injected `now`).
- `backend/api/server.ts`: `GET /api/v1/admin/pulse` (superadminV1).
- New `admin/src/stages/admin-pulse.ts` at `/pulse` (SUPERADMIN_ONLY), top of the Admin nav group; on live, superadmin boot lands here. Full-width layout per the mock.
- **Every card links to its "view all"** — these sub-pages already exist as admin screens: feedback card → Feedback inbox, errors tile → Error log, managers table → User management, guest card → Guest runs. (The all-RUNS sub-page is Phase 5.)
- Reference for the layout: the mock at `/test` → "Live pulse" (admin/src/stages/tests/live-pulse.js), pulse scene.
- Honesty note: the guest tile says "N unclaimed guest runs" (real today); the "became a signup" line waits for the Phase 5 claim marker — never fake it.

## Not in this phase
- Manager/run drill-ins (Phase 4) — manager rows link to the existing User-management detail for now.
- The cross-company all-runs page (Phase 5); login-based "active today" (Phase 6).

## Done when
- [ ] `pulse()` unit tests green (deterministic dates); typecheck clean; no new test failures.
- [ ] Numbers on Pulse cross-check against the Registered / Error-log screens on the same data.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Land on Pulse** — log in at /admin on live (phone). You land on Pulse; the "came back unprompted" tile shows the real count of external managers.
2. **Cross-check** — open User management and compare: same managers, same run counts as the Pulse table. ❌ Not OK if the numbers disagree.
3. **Run types visible** — the runs tile / table shows the meeting types (first, bi-weekly, feels-off…), not just counts.
4. **Guests visible** — the guest-runs card lists guest sessions with how far they got.
5. **Phone check** — everything readable single-column on the phone, no sideways page scroll.
