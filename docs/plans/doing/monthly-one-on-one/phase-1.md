# Phase 1 — Card, runner shell, auto-save

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT 2026-07-13 · **Size:** ~1.5 days

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
- [x] `npm run typecheck` + `npm test` green, incl. new guided-sessions service tests
- [x] A `guided_sessions` row visible in the DB after a walk, `state` carrying typed notes (verify the DESTINATION — query the table)
- [x] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Only you see the card** — your admin account → New 1:1 → "Monthly Check-in" card present. A plain manager account and a logged-out guest → no card. ❌ Not OK if any non-admin sees it.
2. **Locked door** — as the manager account, hit `/guided/<id>` (URL + API). Bounced/403. ❌ Not OK if anything guided renders.
3. **The walk** — start a Monthly Check-in for a roster person: pale-blue runner, big stage titles, floating bottom pill nav on every stage, all 7 stages walkable.
4. **Nothing lost** — type notes in Catch-up, hard-reload mid-meeting. You land back on the same stage with your text intact. ❌ Not OK if anything typed is gone.
5. **Interview untouched** — run a normal Bi-weekly check-in end to end. It behaves exactly as before.

## ✅ GREEN-LIT 2026-07-13
Carl green-lit Phase 1 ("A"). Built + double-checked + verified live on `work/monthly-checkin`.

**Landed:** `guided_sessions` table (own table, never `sessions`) + idempotent migrations 0015/0016 ·
`isInternalIdentity`/`requireInternalAdmin` gate (admin-role OR superadmin-email) · catalog appends the
guided card for internal callers only (never in the positional persona index) · guided-sessions API
(create/get/list/patch/complete), org+manager+person double-fenced, mirrored service tests · runner
ported from the approved prototype into strict-TS stage-config-driven modules (`frontend/src/stages/guided/`):
7-stage machine, floating pill nav, debounced auto-save, reload-resume · client wiring (STAGES.GUIDED,
`/guided/:id` route + deep-link, intake branch). All labels raised to the 14px floor (Carl's call).

**Verified ($0):** typecheck clean (3 configs) · **131/131** · end-to-end in-browser — admin sees the card,
customer app does NOT, runner opens + resumes, notes/outcomes/stage persist to DB (`guided_sessions` row
confirmed), `complete()` sticks as `done`, interview flow untouched.

**Self-review caught + fixed 2 real bugs:** (a) the customer app cross-imports the admin intake but has no
guided runner — gated the card on `window.__seroApp === "admin"` so it only shows where it can run;
(b) after `complete()`, the unmount flush would revert stage `done` → `wrapup` — added a `completed` guard.

**Deviations from the written plan (accepted):** added a denormalised `personName` column to `guided_sessions`
(a parallel session had already created the table with it on the shared local Neon; it's a sensible
denormalisation the `sessions` table also has, and Phase 6's list-merge wants it). Migrations written
idempotent to survive the test-harness server-kill race.

**Honest residual for Carl's eyes (not code):** scenario 1's *negative* case — a plain **manager** account
sees no card — was proven via the API + unit tests, not a live second login. Worth a two-account eyeball
when convenient.

Commits: `5164eaa1` (feature) · `8488f236` (leak + race fixes) · `520e46bf` (pip floor) · `dfdc2df7` (14px).
