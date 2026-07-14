# Phase 1 — Card, runner shell, auto-save

**Part of:** [plan.md](plan.md) · **Status:** ✅ · **Size:** ~1.5 days

## ✅ GREEN-LIT 2026-07-12
Carl: **"A"** — green-lit; the browser walk was **waived** (his call), so this closes on offline
proof + a real-DB destination check rather than a live walk. Shipped on `work/monthly-one-on-one`
(`ea5d2a49`): flag-gated card, the stage-config-driven 7-stage runner (ported from the prototype),
auto-save + reload-resume. **Verified:** typecheck clean · `npm test` 130/131 (1 known-environmental
`test-persona-bench`) · admin build resolves the runner chunk · real local-Neon round-trip
(create → patch typed notes → read-back through the fenced service + a direct table read →
another manager 404s → row cleaned up). Honest residual: the 5-scenario browser walk itself
(card gating in the live UI, the visual runner, reload-resume on screen) wasn't eyeballed — safe
to do any time against the dev server.

## Goal
An internal admin can pick "Monthly Check-in" on the picker and walk the real 7-stage runner — looking exactly like the approved prototype — with auto-save and reload-resume, while every other user and the whole interview flow notice nothing.

## Changes
- Migration: `guided_sessions` table (`backend/db/schema.ts` + generated migration — see plan.md data model).
- Flag: `isInternalAdminIdentity` + `requireInternalAdmin` in `backend/api/middleware/require-auth.ts`.
- Catalog: `GET /api/v1/meeting-types` gains `kind:"interview"` on existing entries; service **appends** `{label:"Monthly Check-in", kind:"guided", badge:"New"}` for internal admins only. Update `catalog.service.test.ts` (deepEquals `MEETING_TYPES` today — make it tolerate `kind` + the appended card, and assert the card is ABSENT for non-internal callers). Engine `backend/engine/meeting-types.ts` untouched.
- API: `backend/api/services/guided-sessions/` — POST create, GET :id, GET ?personId, PATCH :id (auto-save), POST :id/complete (stage flip to `done` only this phase). No AI. Mirrored service tests incl. the person-fence (other org / other manager's person → 404) and role wall (manager → 403).
- Intake branch: `admin/src/stages/intake.js` — guided card → create session → `STAGES.GUIDED`. **Branch before `startSession`** (interview path would `getArc()`-throw). Free-typed name → create person via `POST /api/v1/team/people` first.
- Client: `STAGES.GUIDED` in `admin/src/state.js` + `INTERNAL_ONLY` guard set; `/guided/:id` in `admin/src/router.js` `parseLocation()` + `main.js` loaders/popstate/boot (mirror RUN_DETAIL). Frontend router untouched.
- Runner page: port the prototype ([admin/src/stages/tests/monthly-checkin.js](../../../../admin/src/stages/tests/monthly-checkin.js)) into real modules under `frontend/src/stages/guided/` (admin cross-imports): `guided.page.ts` (stage machine + floating pill nav + auto-save loop), `guided.types.ts`, `coaching-copy.ts`, `side-panel.component.ts` (shell used from Phase 2), per-stage notes areas. Static mock content (promises/requests/goals/scores) stays hardcoded THIS phase — real data arrives per later phase. All strict TS, 14px floor.
- Auto-save: debounced ~600ms PATCH, flush on stage change + `visibilitychange`, Saved/Saving pip; reload-resume via URL id.

## Not in this phase
- Trackers/side-panel data, real rating persistence, sequential-feedback persistence, AI, record template, list merge, member lane.

## Done when
- [x] `npm run typecheck` + `npm test` green, incl. new guided-sessions service + gate tests (typecheck clean · 130/131; the 1 fail is the known-environmental `test-persona-bench`, untracked `_runtime` questions absent in a fresh worktree)
- [x] A `guided_sessions` row visible in the DB after a walk, `state` carrying typed notes — verified the DESTINATION against the real local Neon: create → patch(typed notes) → read-back through the fenced service AND a direct table read, another manager 404s, test row cleaned up
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Only you see the card** — your admin account → New 1:1 → "Monthly Check-in" card present. A plain manager account and a logged-out guest → no card. ❌ Not OK if any non-admin sees it.
2. **Locked door** — as the manager account, hit `/guided/<id>` (URL + API). Bounced/403. ❌ Not OK if anything guided renders.
3. **The walk** — start a Monthly Check-in for a roster person: pale-blue runner, big stage titles, floating bottom pill nav on every stage, all 7 stages walkable.
4. **Nothing lost** — type notes in Catch-up, hard-reload mid-meeting. You land back on the same stage with your text intact. ❌ Not OK if anything typed is gone.
5. **Interview untouched** — run a normal Bi-weekly check-in end to end. It behaves exactly as before.
