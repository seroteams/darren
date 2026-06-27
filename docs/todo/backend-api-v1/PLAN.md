# Backend API v1 (Prototype → Production · Phase 004)

**Goal:** Reshape the backend into clean layers behind a **versioned API** — slim controller →
service → co-located repo — so it can grow without becoming spaghetti. **The product does exactly
what it does today;** this is structure, not features.
**Driver:** Carl
**Created:** 2026-06-27
**Tracks:** the bigger plan in
[../../prototype-to-production/004-backend-api-scaffold/00-phase-overview.md](../../prototype-to-production/004-backend-api-scaffold/00-phase-overview.md).
When this is done + approved, update that effort's `PROGRESS.md` (Phase 004 → `done`).

## Done means
- Every route lives under **`/api/v1/`** and follows the REST verb/status conventions.
- The layers are real: **controllers are thin** (HTTP in/out), **services hold the logic** (never
  touch req/res), **repos own data access** (file-backed now, swappable later).
- **Each service's test is committed _before_ its implementation** (TDD red → green).
- Tests **mirror the system** — unit beside the code, integration/e2e in a `tests/` tree shaped like
  the domains. Not one flat folder.
- `npm test` green; the app + CLI behave **identically** to before.
- **Owner-walked:** Carl can describe swapping a repo's storage with no logic change, and the routes
  respond in the contracted shape.

**Out of scope (park it):** no real auth yet (just the slot), no database yet (keep current
file storage behind the repo seam), no new product features, no UI redesign. Structure only.

## The steps
| # | Step | What it lands | Status |
|---|---|---|---|
| 1 | **Draw the menu of services** | The written `/api/v1/` contract — every route, request + response shape, the error format, the identity/auth slot. **For Carl's review before any code.** | 🔨 drafted — awaiting Carl |
| 2 | Build the shared plumbing | Middleware every request flows through: one error shape, request/identity context, an auth placeholder slot. `npm test` covers the error shape. | ⬜ |
| 3 | Build each service in clean layers (TDD) | Per-domain controller → service → repo, **test-first**. Repos file-backed; storage swappable without touching the service. | ⬜ |
| 4 | Lay out the mirrored test rooms | Unit tests beside the code; integration/e2e in a `tests/` tree shaped like the domains. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested + Carl-approved)

> Detailed `phase-2/3/4.md` step files (each ending in owner QA scenarios) get written **after** Carl
> approves the step-1 contract — same as Phase 003, so we don't guess the shape before the menu is locked.

## Current state

> ### 🔨 2026-06-27 — STEP 1 DRAFTED (the service menu) — AWAITING CARL'S REVIEW
> Baseline before any work: **`npm test` 31/31 green** (free/offline). Note this is 31, not the 30/30
> in older docs — the untracked `checks` handler/service WIP (left over from Phase 003 sign-off) adds
> `test-checks-service.js`. Flagged, not folded in (see "Pre-existing in the tree" below).
>
> Wrote the **service menu / API contract** for review — no code touched:
> **[api-contract.md](api-contract.md)**. It covers: the `/api/v1/` versioning scheme, the one error
> shape, the success-response convention, the identity/context + auth slot, the **9 service domains**,
> and a route-by-route **current → v1** map (all 38 routes) with request/response shapes.
> **Five decisions need Carl's call** — listed at the top of the contract (versioning cutover vs alias,
> success envelope, how strict to push REST onto the SSE/RPC pipeline routes, session-id in path vs
> query, and where the new code lives). **Nothing is built until Carl approves the menu.**
>
> **➡️ NEXT:** Carl reviews [api-contract.md](api-contract.md) and answers the five decisions. Then I
> write the detailed phase-2/3/4 step files and start step 2 (shared plumbing) test-first.

## Pre-existing in the tree (flagged, not touched)
- **`checks` handler/service WIP** — `backend/api/handlers/checks.ts`, `checks.service.ts`,
  `scripts/test-checks-service.js` are untracked, from the Phase 003 sign-off window. They're a thin
  **controller → service** example for the Tasks-board "run free checks" button and happen to model the
  exact layering this phase wants. Left as-is; I'll fold them into the v1 structure during step 3 (or
  Carl can have them committed first). Not part of step 1.
- Other untracked/working-tree changes (admin stages, `content/questions/` artifacts, etc.) are
  unrelated to this phase — untouched.

## Parked
- Migrating the ~52 admin call-sites off the legacy `/api/` paths and removing the compat alias →
  a follow-up once v1 is in place (see decision D1 in the contract).
- Committing the pre-existing `checks` WIP as its own change → Carl's call.
