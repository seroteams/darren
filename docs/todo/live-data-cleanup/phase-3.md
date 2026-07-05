# Phase 3 — Delete the legacy alias routes

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The server serves one API — the ~54 dead legacy `/api/*` alias routes are gone.

## Changes
- `backend/api/server.ts`: remove every bare `/api/*` alias registration (the `adminLegacy` and unwrapped twins). Keep `/api/version`.
- Remove the `adminLegacy` wrapper if nothing uses it any more.
- Drop `GET /api/v1/pipeline/manifest` + its legacy twin (zero consumers anywhere) — unless Carl says keep.
- Cosmetic: the endpoint list text on the Guide page (`admin/src/stages/guide.js`) and any api-contract doc notes.

## Not in this phase
- No frontend changes (done in Phase 2).
- No handler/service changes — only route registrations.

## Done when
- [ ] `grep '"/api/' backend/api/server.ts` shows only `/api/v1/` + `/api/version`.
- [ ] Free checks green: `npm test`, `npm run typecheck`, admin build.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
**Restart the API server first** (old routes live in the running process). All free.
1. **Same click-through as Phase 2** — arcs, job lexicons, test engine strip, start page, new 1:1. Everything still loads. ❌ Not OK if anything that worked in Phase 2 now errors.
2. **Old door is closed** — in the browser, open `http://localhost:3001/api/arcs` directly. You should get a not-found response, NOT arc data.
3. **New door is open** — open `http://localhost:3001/api/v1/arcs` (logged in). Arc data appears.
