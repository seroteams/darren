# Phase 3 — Row actions: role / deactivate / reactivate

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The ⋯ menu on each active member works: change their role, deactivate (switch off login), reactivate — with the safety net that you can't lock a workspace out of its last manager.

## Changes
- **Backend:** extract the last-active-lead guard from `superadmin.service.ts` into shared `backend/api/services/members/account-guards.ts` (`isActiveLead`, `assertNotLastActiveLead`); refactor superadmin to import it (no behaviour change). `members.service` `setRole` / `deactivate` / `reactivate` — org-fenced (`target.orgId === caller.orgId` or 404), last-lead guard, write an `audit_log` row. Endpoints `PATCH /members/:id/role`, `POST /members/:id/{deactivate,reactivate}`.
- **Client:** row menu on active rows (reuse the body-attached menu pattern from `admin-registered.ts`) → `setMemberRole` / `deactivateMember` / `reactivateMember` in `shared/api.js`.

## Not in this phase
- Pending-invite revoke/resend (Phase 4). Team-card cleanup (Phase 5).

## Done when
- [ ] Role change persists (verify the DB), deactivate flips `deactivatedAt`, the last-manager guard blocks (verify the endpoint returns the guard error, not just a UI toast).
- [ ] Every action is org-fenced and audited.
- [ ] `npm run typecheck` + `npm test` green.
- [ ] Product owner walked the scenarios and said go.

## Test scenarios — for the product owner
1. **Change a role** — promote a member to Manager, then back. The badge updates each time.
2. **Last-manager safety** — try to deactivate the *only* manager in a workspace. You should be **blocked** with a plain message. ❌ Not OK if it lets you (that would lock the workspace out).
3. **Deactivate a second manager** — with two managers, switch one off. Tag flips to **Deactivated**; if they were logged in, their session is kicked.
4. **Reactivate** — switch them back on; access returns.
