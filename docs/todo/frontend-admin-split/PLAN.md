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
| 1 | Shared foundation | Pull the genuinely-shared, non-branching machinery (api/sse client, generic UI primitives, base styles) into a `shared/` spot both apps import. `state`/`router` are split later, not moved. **Nothing visibly changes.** | ✅ |
| 2 | Stand up the customer app | A real second Vite app in `frontend/` that imports `shared/` + only the customer stages. Served on its own dev port. Admin app untouched. | 🔨 built, awaiting walk |
| 3 | Slim the admin app | Remove the now-duplicated customer-only stages from the admin build so `admin/` is internal tooling only. | ⬜ |
| 4 | Serve + fence the two apps | API serves the customer app at the public root; admin app served on its own internal route/deploy; prove no secrets/tools in the customer bundle. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 2 🔨 BUILT 2026-07-05 — awaiting Carl's walk (restarted on the Darren check: this is "the single most visible proof of progress").**
- **What landed:** `frontend/` is now a real second Vite app — own `index.html`, `vite.config.js`
  (port **3002**, `/api` proxy to 3001), `tailwind`/`postcss` configs reusing the admin theme, and a
  customer-only `src/main.js` + `src/router.js` + `src/ui/app-nav.js`. The customer stage modules are
  **cross-imported from `../admin/src`** (single source, no copy-drift — the physical move is Phase 3);
  the loader map simply never imports the internal toolset, so none of it reaches the bundle. Static
  assets (favicon, logo, login photos) copied to `frontend/public/`. New scripts: `npm run dev:customer`
  / `npm run build:customer`. Admin app untouched (zero admin-file edits; admin build still passes).
- **Customer app contents:** login/register → manager Home + prep flow (intake → briefing → debrief) +
  their run reviews → member Home · Team · Past 1:1s + privacy/about/feedback. No internal routes exist:
  `/universe`, `/tasks`, `/library`, `/admin/*` all resolve to home.
- **Verified (free, 2026-07-05):** `npm run build:customer` ✓ · bundle grep — zero internal-tool code
  (no Test engine / Universe / lexicons / superadmin API paths; only 2 cosmetic label strings via shared
  `glossary.js`/`stage-labels.js`, tidied in Phase 3) · live on :3002 — login renders, `/api` proxy
  answers, manager login lands on Home with the manager-only rail, `/universe` deep link bounces to `/` ·
  `npm test` 69/69 · typecheck clean · admin build ✓.
- **Phase 2 QA walk (Carl):** with `npm run dev` running, also run `npm run dev:customer`, open
  **http://localhost:3002** → ① log in as the test manager — Home · New 1:1 · Team · Past 1:1s rail,
  no internal tools anywhere ② run the start of a prep flow — it behaves exactly like :3000 ③ type
  `/universe` and `/tasks` in the URL bar — you land back on Home ④ open :3000 — the admin app is
  exactly as before. Green light → commit + Phase 3.

**Phase 1 ✅ ticked 2026-07-01** (Carl, QA-pile clear-out — behaviour-preserving refactor, build resolves all imports, tests green).
- **What landed:** `api.js` + `sse.js` moved to a new repo-root `shared/` folder (with a README); all 26 admin importers repointed to `../../shared/…`; `vite.config.js` `server.fs.allow` opened to the repo root so the sibling `shared/` resolves in dev. `state.js`/`router.js` deliberately **left in admin** — they interleave admin + member concerns and get *split* when the customer app is built (Phase 2/3), not moved whole.
- **Verified (free):** `npm run build` (vite/Rollup) resolves every import — all 27 stages compiled ✓. `npm test` **52/52**, typecheck clean (backend untouched). Frontend has no unit tests, so the build is the resolution proof; the visual "nothing changed" walk is Carl's QA.
- **Baseline (free, 2026-07-01):** `npm test` **52/52** · typecheck clean.
- **Decisions locked** (see below): share via a plain folder (A); JS→TS out of scope.
- **Un-parked 2026-07-05:** restarted on Carl's call ("do all") after the Darren Wednesday check flagged
  this as the agreed, most-visible deliverable. 009 is closed, so the old pause-guardrail no longer applies.
- **Next:** Carl walks the Phase 2 scenarios (above). On green light → commit, then Phase 3 (slim the admin app).

## Decisions (locked 2026-07-01)
- **Sharing = plain folder (A).** Both apps import shared modules via relative paths — simplest, no new tooling. Revisit workspaces (B) only if the customer app grows. (Rejected: copy/duplicate — drifts.)
- **JS→TS out of scope.** The SPA stays JavaScript for this move; convert later in its own plan. This split is behaviour-only.

## Parked
- **Do we even split now, for a 2–3 manager alpha?** The role wall (client) + API wall (server) already keep managers out of admin. A physical split is defence-in-depth + hosting hygiene, not a blocker for the friendly alpha. Fair to keep parked until after 009 unless Carl wants the hosting separation sooner.
- Full **TypeScript** conversion of the customer app — separate plan.
- **Subdomain** hosting (app.sero… vs an internal admin URL) — a Phase 4 hosting choice, decided when we host (009 Phase 2).
- A shared **design-system package** — only worth it once both apps are real and diverging.
