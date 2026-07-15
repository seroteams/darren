# Phase 4 — Pending-invite actions: revoke / resend

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built + committed (`c36fff01`), awaiting final walk

## Built (2026-07-16)
`invites.service.revokeForOrg` (status→revoked, old link 404s) + `resendForOrg` (fresh token, old dies, re-email) — both org-fenced. Endpoints `DELETE /members/invitations/:id` + `POST /members/invitations/:id/resend`. Invite rows get a ⋯ menu (Resend / Revoke). Tests 26/26, typecheck clean.

## Goal
Manage invites that haven't been accepted yet: revoke one (kills the link) or resend it (fresh link, old one dead).

## Changes
- **Backend:** `members.service.revokeInvite` (status → `revoked`, org-fenced) + `resendInvite` (re-mint token, invalidate the old, re-email). Endpoints `DELETE /members/invitations/:id`, `POST /members/invitations/:id/resend`.
- **Client:** row actions on **Invited** rows → `revokeInvite` / `resendInvite` in `shared/api.js`.

## Not in this phase
- Team-card cleanup / dropdown retirement (Phase 5).

## Done when
- [ ] Revoke sets status `revoked` and the old token now 404s (verify by hitting the join link).
- [ ] Resend mints a new token, kills the old, and re-sends the email.
- [ ] `npm run typecheck` + `npm test` green.
- [ ] Product owner walked the scenarios and said go.

## Test scenarios — for the product owner
1. **Revoke** — on a pending invite, choose Revoke. The row leaves the list, and the old join link now says it's no longer valid ("ask your manager for a fresh one"). ❌ Not OK if the old link still works.
2. **Resend** — choose Resend on a pending invite. A new email arrives; the **new** link works, the **old** one is dead.
