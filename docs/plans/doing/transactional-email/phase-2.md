# Phase 2 — Real invite email to the invitee

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-11 — Carl "a" (offline proof mine; live delivery on Carl's confirmation)
Green-lit on A ("tested, good → commit + Phase 3"). Offline proof stood behind by me (`npm test` 122/122,
typecheck clean); the invite email actually arriving is Carl's own confirmation, flagged as such.

## Built (2026-07-11)
Code landed + proven offline (no paid runs). Files:
- `backend/api/services/notifications/notifications.service.ts` (+ `.test.ts`) — added `notifyInviteeOfInvite` (invitee-facing, names inviter + org, clean fallback when either is unknown, HTML-escaped).
- `backend/api/services/invites/invites.controller.ts` — after minting the link, fire-and-forget email to the invitee; builds an **absolute** join URL from `APP_BASE_URL` or the request origin; reuses the tested `preview()` for inviter/org names; the link is still returned so the manager can resend.
- `backend/api/services/invites/invites.service.ts` — updated the stale "no email infra in the alpha" header comment.
- `.env.example` + `render.yaml` — added `APP_BASE_URL` (public origin for the link).

Proof: `npm test` 122/122 (was 120, +2 new), `npm run typecheck` clean. Live delivery is Carl's QA walk (needs Resend signup).

## Goal
When a manager invites a roster person, Sero emails the join link straight to that person — instead of handing the link back to the manager to copy-paste.

## Changes
- **Edit** the invites controller (wraps `invites.service.ts` `create()`) — after the one-time link is minted, fire `sendEmailQuietly` to the invitee with: who invited them, the org name, and the join link. Keep `invites.service.ts` pure (compose the email in the controller, reusing the Phase 1 helper).
- **Edit** the join-flow copy that currently says "no email infra in the alpha."
- **New** test: invite composer builds the right recipient + link; fake sender asserts it.

## Not in this phase
- Admin "new member joined" alert (Phase 3).
- Resend/retry of a failed invite email (still fire-and-forget; the manager can re-invite).

## Done when
- [ ] Inviting a real email address delivers a join-link email the invitee can click to accept.
- [ ] Free checks green: `npm test` + `npm run typecheck`.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Invite reaches the person** — as a manager, invite a real address you control. That inbox should receive a join-link email naming you + the company. Clicking the link opens the accept screen.
2. **The link still works** — accept from the email; you land in as a member. ❌ Not OK if the link is dead or already-used.
3. **Manager flow unbroken** — inviting still succeeds in the UI even if the email can't send (blank key); the manager isn't blocked.
