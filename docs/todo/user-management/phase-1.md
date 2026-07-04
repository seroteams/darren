# Phase 1 — Change a user's role

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
From the Manage menu, the superadmin can set any user's role to member / manager / admin, and it persists — without ever being able to leave a company with no active manager/admin.

## Why
Lowest-risk action (updates the existing `users.role` column, no migration) and it builds the plumbing every later phase reuses: the write repo method, the guardrail spot, the audit call, and the Manage-menu UI on the Registered row.

## Changes
- **Backend:** `PATCH /api/v1/admin/users/:id/role` body `{ role }`, registered as a RegExp route with a named group (mirror `/admin/users/:id/runs`). Validate `role ∈ {admin,manager,member}`. **Guardrail:** refuse a demotion that would leave the org with zero active manager/admin. New `updateUserRole` repo method. Audit success / blocked / failed.
- **Frontend:** add the **Manage** control to the row in [admin-registered.ts](../../../admin/src/stages/admin-registered.ts) → role picker → `setUserRole` in [shared/api.js](../../../shared/api.js) → reload. A blocked demotion surfaces the plain server reason.
- **Tests:** service test (happy path + the last-manager guardrail blocks *and* audits + invalid role) and a route/param test.

## Not in this phase
- Deactivate, delete, reset (their own phases). The Manage menu can list them disabled/"coming next" or add them per phase — no live wiring yet.

## Done when
- [ ] Role change persists (verified in the DB, not just the 200 response).
- [ ] Invalid role rejected (400, unchanged).
- [ ] Demoting a company's last active manager/admin is blocked and audited.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Role sticks** — change a user member→manager, reload. The badge and the stored role both show manager. ❌ Not OK if it reverts.
2. **Last manager protected** — try to demote a company's only manager to member. You should be blocked with a plain reason. ❌ Not OK if it lets you.
3. **Bad input rejected** — an invalid role via the API returns 400 and changes nothing.
4. **Audit trail** — all three attempts appear in the audit log with the right outcome (success / blocked / failed).
