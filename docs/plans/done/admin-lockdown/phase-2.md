# Phase 2 — Internal tools admin-only everywhere

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-20 — Carl walked admin tools intact + manager day untouched on :3099; manager-403 proven by API

## Built (2026-07-20)
- New route wrapper `requireInternalAdminRoute` in `backend/api/middleware/admin-guard.ts` (buildIdentity → `requireInternalAdmin`: role `admin` OR allowlisted superadmin; a plain `manager` is 403).
- `backend/api/middleware/internal-tool-guard.ts`: the non-live branch now uses `requireInternalAdminRoute` instead of `requireAdminRoute`. So the internal engine tools (arcs, role-lexicons, library, persona-runs, regression, suggest-fix, heartbeat, lexicon promotions) require internal-admin on every environment; live keeps its stricter superadmin escalation. No change to the per-company manager features (team, members, runs, guided, trackers) — those keep `requireAdmin` and a manager keeps them.
- Tests updated (TDD): the old "manager passes locally" case flipped to "manager 403"; added "internal admin passes" + "superadmin passes" locally; the per-request-env test now uses an admin session (local pass, live 403).
- **Proof:** `npm test` 163/163, `npm run typecheck` clean. Real prod boot on :3099 (APP_ENV=local, i.e. non-live) with real sessions: manager → `/api/v1/role-lexicons` = **403** (was 200), internal admin (carl@) = **200**, manager → `/api/v1/team/people` (normal day) = **200**. Carl's browser walk below covers the two "still works" checks.

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
