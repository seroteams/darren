# Phase 3 — Delete a user

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The superadmin can permanently remove a user, after an explicit confirm — while their coaching history is kept under the company (just unlinked), and the safety rails hold.

## Why
The one irreversible action, so it's built last of the destructive set, behind a confirm that spells out exactly what happens, and behind the same guardrails as deactivate.

## Changes
- **Backend:** `DELETE /api/v1/admin/users/:id`. The user's finished runs are **kept under the org but orphaned** (`runs.userId = null`) — using the nullability confirmed in Phase 0 (or the migration it flagged). **Guardrails:** no self-delete; no deleting a `SUPERADMIN_EMAILS` account; no deleting the last active manager/admin of an org. Audit all outcomes.
- **Frontend:** delete via the existing `confirm.js` dialog, naming the user and stating runs are kept-but-unlinked → `deleteUser` → row disappears. Blocked deletes surface the plain reason.
- **Tests:** service tests for the runs-orphaning behaviour and each guardrail (blocks + audits).

## Not in this phase
- Reset/invite (Phase 4). Hard-deleting runs (never — history stays under the org).

## Done when
- [ ] Delete removes the user; their runs survive under the org with no owner.
- [ ] All three guardrails hold and are audited.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Gone, but history stays** — delete a test user who has runs. The user disappears; their past 1:1s are still visible at the company level (now unowned). ❌ Not OK if their runs vanish too.
2. **Guardrails** — try to delete yourself, a superadmin account, and a company's only manager. Each is blocked with a plain reason. ❌ Not OK if any goes through.
3. **Audit trail** — every attempt (done + blocked) is in the audit log.
