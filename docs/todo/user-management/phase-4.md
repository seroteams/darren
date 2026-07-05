# Phase 4 — Delete a user

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Permanently remove a user after an explicit confirm — while their coaching history stays under the company (just unlinked), and the safety rails hold.

## Why
The one irreversible action, so it's built last of the destructive set, behind a confirm that spells out what happens and the same guardrails as deactivate.

## Changes
- **Backend:** `DELETE /api/v1/admin/users/:id`. The user's finished runs are **kept under the org but orphaned** (`runs.userId = null`, per the nullability confirmed in Phase 0). **Guardrails:** no self-delete; no deleting a `SUPERADMIN_EMAILS` account; no deleting the org's last active manager/admin. Audit all.
- **Frontend:** delete via the existing `confirm.js` dialog, naming the user and stating runs are kept-but-unlinked → `deleteUser` → row disappears. Blocked deletes surface the plain reason.
- **Tests:** the runs-orphaning behaviour and each guardrail (blocks + audits).

## Not in this phase
- Reset/invite (Phase 5). Hard-deleting runs (never — history stays under the org).

## Done when
- [ ] Delete removes the user; their runs survive under the org with no owner.
- [ ] All three guardrails hold and are audited.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Gone, but history stays** — delete a test user who has runs → the user disappears; their past 1:1s are still visible at the company level (now unowned).
2. **Guardrails** — try to delete yourself, a superadmin account, and a company's only manager → each blocked with a plain reason.
3. **Audit** — every attempt (done + blocked) is in the audit log.
