# Phase 1 — Require login on the internal tooling

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done (green-lit + committed 2026-07-01)

## Goal
Every admin-only endpoint (see PLAN.md "The line we're drawing") requires a logged-in user. Logged out, you get 401 — not internal data. No role logic yet; that's Phase 2.

## Changes
- **The wall** — reuse the existing `buildIdentity` → `requireAuth` pattern already used by the runs controller ([runs.controller.ts:17](../../../backend/api/services/runs/runs.controller.ts)). Apply it at the front of each admin-only route in [backend/api/server.ts](../../../backend/api/server.ts), alongside the origin guard that's already there on the mutating ones.
- **Endpoints touched** (both the `/api/v1/` and legacy `/api/` variants): `arcs` (list/save/reset), `checks/run`, `regression/run`, `pipeline/status`+`manifest`, `lexicon/promote` (pending+apply), `role-lexicons` (list + term add/remove), `suggest-fix`, `library`.
- **Left alone:** `sessions.*`, `catalog` reads, session-scoped `lexicon`, `auth.*`, session `start`.
- **Tests** — mirror the runs-controller auth test: anonymous → 401, logged-in (or dev side-door) → 200/works, for a representative endpoint from each service.

## Not in this phase
- No owner-vs-member role check — a logged-in member still gets in this phase (Phase 2 adds the role wall).
- No console UI changes — the admin tools still show; they just require login to actually call.
- No decision on the flagged `runs` / `catalog` edge cases (Phase 2).

## Done when
- [x] `npm test` (52/52) and `npm run typecheck` green.
- [x] Baseline recorded in PLAN.md before any change (51/51 + typecheck clean).
- [x] Product owner has tested the scenarios below and said go (2026-07-01 — "all passed").

## Test scenarios — for the product owner
Walk these yourself against the running dev server. Phase 2 waits for your green light.
1. **Logged-in still works** — log in as normal, open the internal tools (pipeline view / run a check / arcs editor). Everything works exactly as before. ❌ Not OK if a tool that used to work now errors.
2. **Prep flow untouched** — start a session and go through the prep flow (meeting-type picker, focus points, plan). Works as today. ❌ Not OK if the picker is empty or a stage fails.
3. **Logged out is refused** — log out, then try to reach an internal tool (e.g. reload the pipeline/manifest URL directly). You should be turned away, not shown internal data. ❌ Not OK if you still see the tool's data logged out.
