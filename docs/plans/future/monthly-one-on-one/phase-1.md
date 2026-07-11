# Phase 1 — Card, skeleton, auto-save

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1.5 days

## Goal
An internal admin can pick "Monthly 1:1" on the picker and walk a full 8-stage guided session shell that auto-saves and survives a reload — while every other user and the whole interview flow notice nothing.

## Changes
- Migration: `guided_sessions` table (`backend/db/schema.ts` + generated migration).
- Flag: `isInternalAdminIdentity` + `requireInternalAdmin` in `backend/api/middleware/require-auth.ts`.
- Catalog: `GET /api/v1/meeting-types` gains `kind` on every entry; service **appends** the `{label:"Monthly 1:1", kind:"guided", badge:"New"}` card for internal admins only. Update `catalog.service.test.ts` (currently deepEquals `MEETING_TYPES`). Engine `backend/engine/meeting-types.ts` untouched.
- API: `backend/api/services/guided-sessions/` — POST create, GET :id, GET ?personId, PATCH :id (auto-save), POST :id/complete. No AI. Mirrored service tests.
- Intake branch: `admin/src/stages/intake.js` `confirm()` — guided card → create session → `STAGES.GUIDED`. Free-typed name → create person via `POST /api/v1/team/people` first.
- Client: `STAGES.GUIDED` in `admin/src/state.js`; `/guided/:id` in both routers + both `main.js` boot/popstate (mirror RUN_DETAIL guards); module `frontend/src/stages/guided/` — `guided.page.ts` (step machine, step bar, action bar, auto-save loop), `guided.types.ts`, `coaching-copy.ts` (static copy for all 8 stages, six-block definitions), `step-bar.component.ts`, plus one simple notes-area component per stage (real stage UIs come in later phases). Fetch wrappers in `shared/api.js`.

Static coaching copy source: concept doc + Carl's old-Sero screenshots (catch-up card texts are visible in the screenshots — reuse their tone).

## Not in this phase
- Trackers, six-block rating UI, feedback/wrapup UIs, AI calls, record template, list merge.

## Done when
- [ ] `npm run typecheck` + `npm test` green, incl. new guided-sessions service tests
- [ ] A `guided_sessions` row visible in the DB after a walk (verify the DESTINATION — query the table, don't trust the client)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Only you see the card** — log in as your admin account → New 1:1 → the "Monthly 1:1" card is there. Log in as a plain manager test account and as a logged-out guest → no card. ❌ Not OK if any non-admin sees it.
2. **Locked door** — as the manager test account, paste a `/guided/<id>` URL and hit the API directly. You should be bounced/403. ❌ Not OK if anything guided renders.
3. **The walk** — start a Monthly 1:1 for a roster person, walk Prep → Catch-up → … → Review → Finish. The step bar tracks where you are; every stage shows its coaching copy and a notes box.
4. **Nothing lost** — type notes in Catch-up, hard-reload the browser mid-meeting. You should land back on the same stage with your text intact. ❌ Not OK if anything typed is gone.
5. **Interview untouched** — run a normal Bi-weekly check-in end to end. It behaves exactly as before.
