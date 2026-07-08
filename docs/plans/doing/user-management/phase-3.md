# Phase 3 — Deactivate / reactivate a user

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Switch a user off (block login, kick their live session) and back on again — reversible, deletes nothing.

## Why
Deactivate is the safe alternative to Delete; most "remove this person" needs are really "stop their access". Building it before Delete keeps Delete the rare, last-resort action.

## Changes
- **Schema/migration:** nullable `deactivatedAt timestamp` on `users` ([schema.ts](../../../backend/db/schema.ts)) + a Drizzle migration; null = active.
- **Backend:** `POST /api/v1/admin/users/:id/deactivate` + `.../reactivate`. Login **must** reject deactivated users ([auth.service.ts](../../../backend/api/services/auth/auth.service.ts)). **Session invalidation is mandatory** — deactivate revokes the user's live `auth_sessions` immediately (kicked now, not just blocked next login). **Guardrails:** no self-deactivate; no deactivating a `SUPERADMIN_EMAILS` account; no deactivating the org's last active manager/admin. Audit all.
- **Frontend:** deactivate/reactivate in the `⋯` menu + a clear "Deactivated" state on the row.
- **Tests:** login-block, mandatory session revocation, and each guardrail (blocks + audits).

## Not in this phase
- Delete (Phase 4). Reset/invite (Phase 5).

## Done when
- [ ] A deactivated user is logged out *now* and cannot log back in.
- [ ] Reactivate restores login.
- [ ] All three guardrails hold and are audited.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Kicked now** — deactivate a user who's currently logged in → their next action is bounced, and they can't log back in.
2. **Reversible** — reactivate → they log in again, nothing lost.
3. **Guardrails** — try to deactivate yourself, a superadmin account, and a company's only manager → each blocked with a plain reason.
4. **Clear on screen** — the row plainly shows who's deactivated.
