# Phase 2 — Re-point console data to the org (real isolation)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Switch the console off the shared pre-auth placeholder org and onto the logged-in company's fenced data, so two companies cannot see each other's sessions or runs in the UI.

## Changes
- **Verify the fence FIRST (the one unknown):** confirm the generic v1 routes (`POST /api/v1/sessions`, `GET /api/v1/runs/recent`, `GET /api/v1/sessions/:id`, …) derive `orgId` from the session cookie's identity and filter by it — the way `/auth/me/runs` does. Check [backend/api/middleware/request-context.ts](../../../backend/api/middleware/request-context.ts), `v1Route`, and the sessions/runs repos. If any v1 route still falls back to `DEFAULT_ORG_ID`, that's a small backend fix and the **first task** here — flag it, don't paper over it (engine-honesty rule).
- **Migrate the client** — rewrite each [admin/src/api.js](../../../admin/src/api.js) data function from the legacy `/api/` shape to the v1 shape. Main mechanical change: **id-in-path** instead of `?s=<id>` / body `sessionId`:
  - `startSession` → `POST /api/v1/sessions`
  - `getSession`/`getQuestion`/`getRoleProfile`/`suggestAnswers`/`getStagePreview` → `GET /api/v1/sessions/:id/…`
  - `submitAnswer`/`goBack`/`postNote`/`setAgendaCovered`/`setSelectedFocus`/`postVerdict`/lexicon decisions → `POST /api/v1/sessions/:id/…`
  - SSE streams (`focus-points`/`plan`/`bank`/`evaluation`/`preparation`) → `GET /api/v1/sessions/:id/<name>/stream`
  - runs history/overview/full/stages/review/archive/delete → `/api/v1/runs/…`
  - arcs, role-lexicons, regression, pipeline, suggest-fix, library → their `/api/v1/` paths
  Update call sites where a signature changes (id now a path segment).

## Not in this phase
- No new features on the v1 endpoints beyond what's needed for parity with today's console.
- Org-name display stays parked.

## Done when
- [ ] `npm test` and `npm run typecheck` green.
- [ ] The two-company isolation walk below passes live.
- [ ] Product owner has tested the scenarios and said go.

## Test scenarios — for the product owner
Walk these yourself. Phase closes on your green light.
1. **Company A runs** — log in as Company A, run/save a session. ❌ Not OK if the session won't start or save.
2. **Company B runs** — register Company B, run a session. ❌ Not OK if it errors.
3. **A is fenced** — back as Company A, look at recent runs. You should see only A's. ❌ Not OK if B's runs show.
4. **B is fenced** — as Company B, look at recent runs. You should see only B's. ❌ Not OK if A's runs show.
5. **No cross-open** — as A, try to open one of B's runs by id. You should be refused / not-found. ❌ Not OK if it opens.
