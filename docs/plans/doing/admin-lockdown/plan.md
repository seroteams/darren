# Admin lockdown — /admin becomes super-admin only

**Goal:** Managers and members live entirely in the customer app at `/`; the `/admin` console is locked at the server so only super-admins can even load it.
**Driver:** Carl
**Created:** 2026-07-20
**Mockup:** none — no visual surface (access-control / routing plan; no screen changes)

## Done means
- Visiting `/admin` while logged out, or as a manager or member, lands you on the normal app at `/` — you never see the admin console load.
- A super-admin visiting `/admin` gets the console exactly as today.
- Managers/members are never *sent* to `/admin` by any login, email, or link.
- Internal engine tools (arcs, lexicons, library, persona runs) answer only to internal admins on every environment, not just live.

## Resolved before we start
- **Customer app already has the full manager flow.** `frontend/src/router.js` (built as frontend-admin-split Phase 2) carries START, team, members, runs, guided, and the whole 1:1 flow (`/new` → `/debrief`). Nobody is stranded by locking `/admin`.
- **Data was never exposed.** All `/api/v1/admin/*` endpoints are already superadmin-gated + audited (`backend/api/middleware/superadmin-guard.ts`). This plan locks the *shell*, and tightens the internal-tool fence.
- **The hole (from the 2026-07-20 RBAC audit):** `server.ts:705-707` serves the admin bundle via `createStaticHandler` with no identity check at all — the only guards are cosmetic client-side bounces in `admin/src/main.js` boot/popstate.
- **Dev is unaffected by the prod lock** (static serving only runs when `IS_PROD`); dev keeps Vite on :3000 (admin) / :3002 (customer). Phase 1 adds the same bounce client-side so dev behaves alike.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Lock the door | `/admin` bundle served only to super-admins in prod; everyone else 302 → `/`; same bounce client-side for dev | ⬜ |
| 2 | Internal tools admin-only everywhere | internal-tool guard stops accepting `manager` on any environment | ⬜ |
| 3 | Fix the signposts | no login/register/email/link ever points a manager or member at `/admin` | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Plan set up 2026-07-20 from the full-system URL/RBAC audit (two Explore sweeps: app routing + backend guards). Board: https://claude.ai/code/artifact/93007886-2e0b-445f-a8cd-8628aa9839f1 . Waiting on Carl's read-through before Phase 1 starts. Baseline to be run at Phase 1 kickoff.

## Parked
- Slim the admin bundle down to console + internal screens only (drop the duplicated manager/member stages) — bigger refactor, not needed once the door is locked.
- Client-side `setState` navigation has no role re-check (audit hole 2) — cosmetic once the bundle itself is gated; revisit only if the bundle ever un-gates.
- `resolveAppEnv()` vs `NODE_ENV` — two different "which environment" notions in the backend; worth unifying some day.
