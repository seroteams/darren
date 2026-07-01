# Phase 2 — Add the admin-role wall + hide the UI

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The internal tooling requires an **owner/admin** role, not just any login — a logged-in **member** is refused (403). The console hides the admin-only tools from non-admins. And we add a way to create a member so this is actually testable.

## Changes
- **`requireAdmin` guard** — a small middleware: `buildIdentity` → `requireAuth` (401 if logged out) → require the role to be `owner` or `admin`, else `forbidden` (403). Unit tested.
- **Upgrade the Phase 1 routes** — swap the plain `requireAuth` on the admin-only endpoints for `requireAdmin`.
- **A testable member** — the smallest thing that lets us create a non-owner account (a dev-only seed, or a way to set a second user's role to `member`). Without this the 403 path can't be walked, since register only ever makes owners today.
- **Hide the admin UI** — the console reads the role from `/auth/me` and hides the admin-only nav/screens (pipeline, checks, regression, arcs, lexicon promotion, role-lexicons, suggest-fix, library) from non-admins.
- **Settle the flagged edge cases** (from PLAN.md): decide with Carl whether `runs` review/archive/delete and `catalog` reads move admin-only or stay as they are, and apply that decision.

## Not in this phase
- No roles-management UI (inviting teammates, assigning roles) — parked; this phase only needs a minimal way to *get* a member for testing.
- No route-prefix (`/api/admin/*`) restructure — parked (Option B).
- No separate customer app — parked (Option C).

## Done when
- [ ] `npm test` and `npm run typecheck` green.
- [ ] The flagged edge cases have a recorded decision in PLAN.md.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. This is the last phase — on your green light the plan closes out.
1. **Owner still gets in** — logged in as your (owner) account, the admin tools show and work. ❌ Not OK if you're locked out of your own tools.
2. **Member is blocked** — using the new member account, the admin-only tools are **hidden**, and hitting one directly is refused. ❌ Not OK if a member sees or can use an internal tool.
3. **Member keeps the prep flow** — that same member can still start and run a normal prep session. ❌ Not OK if the role wall also blocks the customer flow.
4. **Logged out is still refused** — same as Phase 1, still turned away logged out. ❌ Not OK if logging out somehow re-opens a tool.
