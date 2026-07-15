# Phase 2 — Invite with role

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The "Invite people" button works: type an email, pick a role (Manager / Member), send. The person gets a join link; accepting mints an account with the chosen role.

## Changes
- **Backend:** `invites.repo.ts` — make `NewInvite.personId` optional + carry `role`; `createMemberUser` takes a `role` param instead of hardcoding `member`. `invites.service.ts` — new `createForOrg(orgId, invitedBy, email, role)` (no roster lookup, no personId); `accept` reads the stored `inv.role` and passes it through. `members.service.inviteMember` + `POST /api/v1/members/invite`. Reuse `notifyInviteeOfInvite`. Tests updated red→green.
- **Client:** "Invite people" button on Members → modal (email + role select), reusing the `add-person-modal.ts` focus-trap/apm patterns. `inviteMember(email, role)` in `shared/api.js`.

## Not in this phase
- Changing an existing member's role, deactivating, revoking/resending (Phases 3–4).

## Done when
- [ ] A person-less org invite is created and emailed; accepting it creates a `users` row with the **chosen** role (verify the DB row's role, not just the UI).
- [ ] Roles offered are Manager / Member only.
- [ ] `npm run typecheck` + `npm test` green.
- [ ] Product owner walked the scenarios and said go.

## Test scenarios — for the product owner
1. **Invite a member** — Invite people → enter a fresh email, role **Member** → send. Row appears as **Invited**. Open the join link, set a password → you land as a **member** (only own 1:1s). *(Live email round-trip is your step — I can't create accounts/passwords for you.)*
2. **Invite a manager** — same, role **Manager** → after accepting, that account is a **manager** (reaches the console). ❌ Not OK if it comes out as a member.
3. **Bad input** — an email with no "@" is refused with a plain message; inviting an email that already has an account is handled sanely (no crash).
