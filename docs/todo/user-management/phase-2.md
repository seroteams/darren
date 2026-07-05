# Phase 2 — Change a user's role

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
From the row's `⋯` menu, set any user's role to member / manager / admin, persisted — without ever leaving a company with no active manager/admin.

## Why
Lowest-risk action (updates the existing `users.role` column, no migration) and it builds the mutation plumbing every later phase reuses: the write repo method, the guardrail spot, the audit call, and the `⋯`-menu action pattern.

## Changes
- **Backend:** `PATCH /api/v1/admin/users/:id/role` `{ role }`, a RegExp route with a named group (mirror `/admin/users/:id/runs`). Validate `role ∈ {admin,manager,member}`. **Guardrail:** refuse a demotion that would leave the org with no active manager/admin. New `updateUserRole` repo method. Audit success/blocked/failed.
- **Frontend:** "Change role" in the row's `⋯` menu → role picker → `setUserRole` in [shared/api.js](../../../shared/api.js) → reload; a blocked demotion shows the plain reason.
- **Tests:** service test (happy path + last-manager guardrail blocks *and* audits + invalid role) and a route/param test.

## Not in this phase
- Deactivate / delete / reset (their own phases).

## Done when
- [ ] Role change persists (verified in the DB, not just the 200).
- [ ] Invalid role rejected (400, unchanged).
- [ ] Demoting a company's last active manager/admin is blocked and audited.
- [ ] `npm test` + `npm run typecheck` pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Role sticks** — change a user member→manager, reload. The badge and the stored role both show manager.
2. **Last manager protected** — try to demote a company's only manager → blocked with a plain reason.
3. **Bad input** — an invalid role via the API → 400, nothing changes.
4. **Audit** — all three attempts appear with the right outcome (success / blocked / failed).
