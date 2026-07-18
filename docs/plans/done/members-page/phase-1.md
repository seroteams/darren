# Phase 1 — Read-only Members list + nav

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit

## ✅ GREEN-LIT 2026-07-15 — Carl walked the Members list + nav ("yeah all good")

## Built (2026-07-15)
- Backend: `backend/api/services/members/{members.repo,members.service,members.controller}.ts` + `members.service.test.ts`; `GET /api/v1/members` wired in `backend/api/server.ts` (requireAdmin, org-fenced).
- Frontend: `frontend/src/stages/{members,members-table}.ts` + `members-table.test.ts` + `frontend/src/styles/members.css`; `MEMBERS` stage in `admin/src/state.js`; registry in `frontend/src/main.js`; route in `frontend/src/router.js`; nav item in `frontend/src/ui/app-nav.js`; `getMembers()` in `shared/api.js`.
- Offline proof: **members tests 9/9 pass**, `npm run typecheck` clean. Live on-screen check = the owner walk below (couldn't self-screenshot: the shared dev-server/API state was down, not a code issue).

## Goal
A manager/admin can open a new **Members** screen and see everyone in their workspace (login accounts + pending invites), read-only. No actions yet.

## Changes
- **Backend (test-first):** new `backend/api/services/members/` domain — `members.repo.ts` (`listOrgUsers(orgId)`, `listPendingInvites(orgId)`, both org-fenced), `members.service.ts` (`listMembers` → merges into rows with status `active | invited | deactivated`), `members.controller.ts` (`GET /api/v1/members`). Route wired in `backend/api/server.ts` with `requireAdmin`. Co-located `.test.ts` + `tests/integration/members/`.
- **Client:** add `MEMBERS` to `admin/src/state.js` STAGES; `getMembers()` in `shared/api.js`; new `frontend/src/stages/members.ts` (read-only table adapted from `admin/src/stages/admin-registered.ts` — role badge + status tag, **no** row menu) + `members.test.ts` (pure render); route in `frontend/src/router.js`; nav item in `frontend/src/ui/app-nav.js` (`mgr:true`).

## Not in this phase
- Inviting, changing roles, deactivating, revoking — all later phases.
- Any change to the Team card / removing the old dropdown (Phase 5).

## Done when
- [ ] `GET /api/v1/members` returns the caller's org users + pending invites, and a second seeded org's data never appears (verify against the DB/response, not just the UI).
- [ ] The Members nav item + screen render the list with correct status tags.
- [ ] `npm run typecheck` + `npm test` green.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. Phase 2 waits for your green light.
1. **See the screen** — open **Members** from the nav. You should see yourself listed as **Active** with your role, plus anyone already linked. ❌ Not OK if the page errors or is empty when you know you have members.
2. **Pending shows up** — (if any invite is outstanding) it appears with an **Invited** tag. 
3. **Deactivated shows up** — a switched-off account shows a **Deactivated** tag, not hidden.
4. **Members can't reach it** — log in as a plain member and try the Members URL; you should be bounced (it's not in their menu). ❌ Not OK if a member can see the list.
5. **Walls hold** — (I'll set up a second test workspace) confirm its people never show in yours.
