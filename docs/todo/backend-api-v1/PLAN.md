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
| 1 | **Draw the menu of services** | The written `/api/v1/` contract — every route, request + response shape, the error format, the identity/auth slot. Decisions D1–D5 locked. | ✅ |
| 2 | Build the shared plumbing | Middleware every request flows through: one error shape, request/identity context, an auth placeholder slot. `npm test` covers the error shape. | ✅ |
| 3 | Build each service in clean layers (TDD) | Per-domain controller → service → repo, **test-first**. Repos file-backed; storage swappable without touching the service. | ⬜ |
| 4 | Lay out the mirrored test rooms | Unit tests beside the code; integration/e2e in a `tests/` tree shaped like the domains. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested + Carl-approved)

> Detailed `phase-2/3/4.md` step files (each ending in owner QA scenarios) get written **after** Carl
> approves the step-1 contract — same as Phase 003, so we don't guess the shape before the menu is locked.

## Current state

> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — 6 of 9 safe domains layered
> Added since the 3-domain mark, each test-first + behaviour-identical + `npm test` green:
> - **pipeline** (`043dc9b6`) — status branching behind a repo; fake repo exercises all 3 branches.
> - **library** (`c90730c8`) — pure path logic (incl. the traversal guard, now unit-tested) + fs repo;
>   file server, so no v1Route (manages its own responses).
> - **checks** (`ce2665d9`) — relocated the already-layered pair into `services/checks/` (git mv).
> Now **40/40** tests, typecheck clean. **Remaining safe (the bigger 3):** `arcs`, `lexicon`, `runs`.
> Then **stop before the live `sessions` pipeline**. The v1 URL-shape policy (mirror legacy under
> `/api/v1/`, defer REST polish) still stands.
>
> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — 3 of 9 safe domains layered (catalog, role-lexicons, regression)
> Carl approved the catalog pattern and said "go for it." Done + committed, each test-first +
> behaviour-identical + `npm test` green at each:
> - **catalog** (`9060123f`) — meeting-types + personas; repo seam proven via in-memory fake.
> - **role-lexicons** (`7de91fd8`) — list/add/remove over the role-profile engine (repo seam).
> - **regression** (`6eb200b6`) — compute-only; injected suite runner is the seam (no repo).
> Now 38/38 tests, typecheck clean. **Remaining safe:** `pipeline`, `library`, `checks` (relocate the
> already-layered pair), `arcs`, `lexicon`, `runs`. **Then stop before the live `sessions` pipeline.**
>
> **⚠️ Policy call I'm making (flag for Carl) — v1 URL shape:** to stay behaviour-identical and surgical,
> v1 routes **mirror the legacy request/response shapes under the `/api/v1/` prefix** (with free renames
> like `persona-bench` → `personas`). The contract's fuller REST polish — key-in-path
> (`/role-lexicons/:key/terms`), `DELETE` verbs, merging collections (`/runs?status=`) — **changes request
> shapes and adds dual-controller code for v1 routes nothing calls yet**, so I'm **deferring it** to a
> dedicated polish pass (its own decision at the phase walk). Tell me if you'd rather I do the full REST
> shapes now. The **layering** (the hard part) is identical either way, so this isn't rework.
>
> ### 🔨 2026-06-27 — catalog domain layered (proof of pattern)
> First domain converted to clean layers (decision D5), **test-first** (red → green):
> `backend/api/services/catalog/` — `catalog.repo.ts` (file storage, behind a `CatalogRepo`
> interface) → `catalog.service.ts` (`createCatalogService(repo)` — sort + meetingTypeIndex logic, never
> touches req/res or storage) → `catalog.controller.ts` (thin: call service, `c.json`). Plus
> `middleware/v1-route.ts` — wraps a controller so v1 errors use the one shape; legacy routes keep the old
> shape (D2). Co-located tests written **before** the code: `catalog.service.test.ts` (proves the
> **swap-storage seam** — an in-memory fake repo, zero service change) + `v1-route.test.ts`.
> - **Wiring (server.ts):** `GET /api/v1/meeting-types`, `GET /api/v1/personas` (v1 error shape) + the
>   legacy `/api/meeting-types`, `/api/persona-bench` aliases on the same controller (D1). Removed the two
>   now-orphaned handlers (`handlers/meeting-types.ts`, `handlers/persona-bench.ts` — only server.ts used them).
> - **Verified (free):** `npm test` **36/36**, `npm run typecheck` clean. Live boot on :3999 → v1 and legacy
>   responses **byte-identical** to before (diff clean for both meeting-types and personas).
> - **Not committed yet — awaiting your walk.** Then I continue step 3 domain by domain; I'll **stop again
>   before the live `sessions` pipeline** (the risky one).
>
> ### ✅ 2026-06-27 — STEP 2 DONE (shared plumbing) — Carl approved ("then lets go") + committed
> Carl walked the free checks and approved. Committed locally.
>
> ### 🔨 2026-06-27 — STEP 2 BUILT (shared plumbing) test-first
> New layer `backend/api/middleware/` (decision D5), built **test-first** (red → green):
> - **`http-error.ts`** — the one error shape `{ error: { code, message, details? } }`: an `HttpError`
>   class, `toErrorBody()`/`errorStatus()` (also map the existing `Object.assign(new Error,{status})`
>   throws to a code), and lean factory helpers (`badRequest`/`notFound`/`validationFailed`/…). 5xx are
>   masked to a generic message — the raw error is logged, never sent (engine honesty).
> - **`request-context.ts`** — `RequestIdentity { userId, orgId, roles }` + `anonymousIdentity()` +
>   `buildIdentity(req)` (anonymous now — the shape Phase 006's login check fills in).
> - **`require-auth.ts`** — the no-op login-check **slot** (never rejects in Phase 004).
> - Co-located tests `http-error.test.ts` + `request-context.test.ts` (`node:test`), written **before**
>   the code. Extended `scripts/run-tests.js` to discover co-located `backend/**/*.test.ts` so `npm test`
>   covers them (this also picked up the orphaned `clamp.test.ts`).
> - **Verified (free):** `npm test` **34/34** (was 31; +clamp +2 new), `npm run typecheck` clean, no
>   banned constructs (`any`/`as`/`@ts-ignore`/`!`). **Not committed yet — awaiting your walk.**
> - **Not touched:** the live router/handlers still emit the legacy `{ error: string }` shape; v1 routes
>   adopt `toErrorBody` in step 3 (keeps the admin unbroken — decision D2).
>
> **➡️ NEXT after your sign-off:** commit step 2, then step 3 — convert the first small domain
> (catalog or the existing `checks` pair) to controller → service → repo, test-first.
>
> ### ✅ 2026-06-27 — STEP 1 DONE (the service menu) — decisions D1–D5 locked by Carl ("choose the best")
> Carl delegated the five open decisions; I took the recommended low-risk/behaviour-identical option on
> each (D1 alias · D2 leave bodies · D3 pragmatic REST · D4 id-in-path · D5 services/ + middleware/ tree).
> The contract is now final and committed. **➡️ NEXT:** step 2 — build the shared plumbing (one error
> shape + request/identity context + no-op auth slot) **test-first**. Awaiting Carl's go before writing code.
>
> ### 🔨 2026-06-27 — STEP 1 DRAFTED (the service menu)
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
- **`checks` handler/service** — `backend/api/handlers/checks.ts`, `checks.service.ts`,
  `scripts/test-checks-service.js` are now **tracked/committed** (the auto-commit automation landed them
  since the session-start snapshot — the earlier "untracked" note was stale). They're a thin
  **controller → service** example for the Tasks-board "run free checks" button and happen to model the
  exact layering this phase wants — a natural first candidate to slot into the v1 structure in step 3.
- Other untracked/working-tree changes (admin stages, `content/questions/` artifacts, etc.) are
  unrelated to this phase — untouched.

## Parked
- Migrating the ~52 admin call-sites off the legacy `/api/` paths and removing the compat alias →
  a follow-up once v1 is in place (see decision D1 in the contract).
- Committing the pre-existing `checks` WIP as its own change → Carl's call.
