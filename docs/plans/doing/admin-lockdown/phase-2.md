# Phase 2 — Internal tools admin-only everywhere

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The internal engine tools (meeting arcs, role lexicons, library, persona runs, regression, suggest-fix, lexicon promotions) answer only to internal admins — on every environment, not just the live one.

## Changes
- `backend/api/middleware/internal-tool-guard.ts` — today it only escalates to super-admin when the environment is "live"; everywhere else a plain `manager` passes. Change: the base requirement becomes internal admin (role `admin` or super-admin email) on all environments; live keeps its stricter super-admin escalation.
- `backend/api/middleware/require-auth.ts` — reuse the existing `requireInternalAdmin`; no new guard invented.
- Tests first: guard tests covering manager (403), admin (200), superadmin (200), per environment.

## Not in this phase
- Any change to manager-facing business routes (team, members, runs, guided, trackers) — `requireAdmin` there is intentional and stays.
- Signpost fixes (Phase 3).

## Done when
- [ ] A manager session calling any internal-tool endpoint gets 403 on a non-live environment (verified with a real request).
- [ ] Admin-role and super-admin sessions still reach them; live behaviour unchanged.
- [ ] `npm test` + `npm run typecheck` green; no manager-facing feature breaks.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Manager can't reach the toolbox** — `local > log in as manager@seroteams.com > type /admin/library then /admin/meeting-arcs in the address bar`. You should get bounced to the app home each time (and I'll show you the 403 proof from the API side). ❌ Not OK if any internal tool screen loads with data.
2. **Your normal manager day is untouched** — as the same manager: open Team, open a past 1:1, start a new 1:1 prep. All work as before. ❌ Not OK if anything 403s or looks empty that wasn't before.
3. **Super-admin toolbox intact** — as your super-admin account: Library, Meeting arcs, Personas all load with data as before.
