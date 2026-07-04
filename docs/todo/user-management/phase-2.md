# Phase 2 — Deactivate / reactivate a user

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The superadmin can switch a user off (block login, kick their live session) and back on again — a reversible off-switch that deletes nothing.

## Why
Deactivate is the safe alternative to Delete; most "remove this person" needs are really "stop their access". Building it before Delete means Delete becomes the rare, last-resort action.

## Changes
- **Schema/migration:** add nullable `deactivatedAt timestamp` to `users` ([schema.ts](../../../backend/db/schema.ts)) + a Drizzle migration; null = active.
- **Backend:** `POST /api/v1/admin/users/:id/deactivate` and `.../reactivate`. Login **must** reject deactivated users ([auth.service.ts](../../../backend/api/services/auth/auth.service.ts)). **Session invalidation is mandatory** — deactivate revokes the user's live `auth_sessions` immediately (kicked now, not just blocked next login). **Guardrails:** no self-deactivate; no deactivating a `SUPERADMIN_EMAILS` account; no deactivating the last active manager/admin of an org. Audit all outcomes.
- **Frontend:** deactivate/reactivate toggle on the row + a clear "Deactivated" visual state.
- **Tests:** service tests for login-block, mandatory session revocation, and each guardrail (blocks + audits).

## Not in this phase
- Delete (Phase 3). Reset/invite (Phase 4).

## Done when
- [ ] A deactivated user is logged out *now* and cannot log back in.
- [ ] Reactivate restores login.
- [ ] All three guardrails hold and are audited.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Kicked now** — deactivate a user who's currently logged in. Their very next action is bounced, and they can't log back in. ❌ Not OK if they stay logged in until their session expires.
2. **Reversible** — reactivate the same user → they can log in again, nothing lost.
3. **Guardrails** — try to deactivate yourself, a superadmin account, and a company's only manager. Each is blocked with a plain reason. ❌ Not OK if any goes through.
4. **Clear on screen** — the row plainly shows who's deactivated.
