# Split the customer app out from the admin app

**Goal:** The customer-facing app (login → prep flow → member Home/Team/Runs) becomes its **own** built app in `frontend/`, and `admin/` shrinks to internal tooling only — so a customer never downloads a single line of admin code, and the two can be hosted and locked down separately.
**Driver:** Carl
**Created:** 2026-07-01

## Why this matters (the boundary today)
Right now there is **one** app. `admin/` is a single Vite SPA that serves *both* the customer prep flow *and* every internal tool; the only wall is a role check inside that one app ([router.js `ADMIN_ONLY`](../../../admin/src/router.js), [main.js:118](../../../admin/src/main.js)). The server-side API wall is real and already done ([admin-guard.ts](../../../backend/api/middleware/admin-guard.ts)) — this plan is the **front-end** half of the same split. `frontend/` is currently an empty placeholder ([frontend/README.md](../../../frontend/README.md)).

## Done means
- Opening the **customer app** shows login/register → the prep flow → member Home · Team · Runs, and **no admin tools anywhere** — not hidden, not in the code.
- Opening the **admin app** shows the full internal toolset, exactly as today.
- The built customer bundle (`frontend/dist`) contains **zero** admin-tool code (grep proves it).
- The two apps are served as two separate things, so admin can later sit behind its own lock / not be publicly reachable.
- Everything a manager does today still works end-to-end (nothing regressed).

## Phases (strangler order: enable → add → subtract → wire)
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Shared foundation | Pull the genuinely-shared, non-branching machinery (api/sse client, generic UI primitives, base styles) into a `shared/` spot both apps import. `state`/`router` are split later, not moved. **Nothing visibly changes.** | 🔨 |
| 2 | Stand up the customer app | A real second Vite app in `frontend/` that imports `shared/` + only the customer stages. Served on its own dev port. Admin app untouched. | ⬜ |
| 3 | Slim the admin app | Remove the now-duplicated customer-only stages from the admin build so `admin/` is internal tooling only. | ⬜ |
| 4 | Serve + fence the two apps | API serves the customer app at the public root; admin app served on its own internal route/deploy; prove no secrets/tools in the customer bundle. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 STARTED 2026-07-01 (Carl green-lit "start Phase 1 now") — build not yet done; best continued in a fresh session.**
- **Baseline captured (free, 2026-07-01):** `npm test` **52/52** · `npm run typecheck` clean.
- **Decisions locked** (see below): share via a plain folder (A); JS→TS out of scope.
- **Blast-radius finding (why the build wants its own fresh session):**
  - `api.js` + `sse.js` alone are imported in **27 files** — the "move shared machinery" step is a wide, mechanical import-repoint.
  - `state.js` (the `STAGES` enum) and `router.js` interleave admin **and** member concerns — they can't be "moved whole"; they get **split** when the customer app is built (Phase 2/3), not in the foundation step. Phase 1 is refined to move only the genuinely-shared, non-branching modules (api/sse, generic `ui/` primitives, base styles).
  - **Verification is build/preview-only:** `npm test` + `tsc` are backend-only and won't catch a broken frontend import. Phase 1 must be verified with a Vite build (mind the dev-server port conflict — Carl runs 3000/3001).
- **Heads-up (guardrail):** this is **parked** in the live plan ([009](../009-ready-to-share/PLAN.md) "Option C"); building it pauses 009 alpha-readiness. Carl chose to start it knowingly.

## Decisions (locked 2026-07-01)
- **Sharing = plain folder (A).** Both apps import shared modules via relative paths — simplest, no new tooling. Revisit workspaces (B) only if the customer app grows. (Rejected: copy/duplicate — drifts.)
- **JS→TS out of scope.** The SPA stays JavaScript for this move; convert later in its own plan. This split is behaviour-only.

## Parked
- **Do we even split now, for a 2–3 manager alpha?** The role wall (client) + API wall (server) already keep managers out of admin. A physical split is defence-in-depth + hosting hygiene, not a blocker for the friendly alpha. Fair to keep parked until after 009 unless Carl wants the hosting separation sooner.
- Full **TypeScript** conversion of the customer app — separate plan.
- **Subdomain** hosting (app.sero… vs an internal admin URL) — a Phase 4 hosting choice, decided when we host (009 Phase 2).
- A shared **design-system package** — only worth it once both apps are real and diverging.
