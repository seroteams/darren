# Phase 3 — Admin "new member joined" alert

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-11 — Carl "a" (offline proof mine; live delivery on Carl's confirmation)
Green-lit on A ("tested, good → commit + close the track"). Offline proof stood behind by me
(`npm test` 122/122, typecheck clean); the join alert actually arriving is Carl's own confirmation, flagged as such.

## Built (2026-07-11)
Code landed + proven offline (no paid runs). Files:
- `backend/api/services/notifications/notifications.service.ts` (+ `.test.ts`) — added `notifyAdminOfNewMember`; refactored the shared admin-alert body into one `adminAccountAlert` helper (signup + new-member reuse it), so the registration alert's output is unchanged.
- `backend/api/services/invites/invites.controller.ts` — one fire-and-forget line in `acceptInvite()`, after the member account is created.

Proof: `npm test` 122/122, `npm run typecheck` clean (notifications suite now 8 assertions). Live delivery is Carl's QA walk (needs Resend signup).

## Goal
Carl gets an email when an invited person actually accepts and their member account is created — closing the loop on the invite.

## Changes
- **Edit** `backend/api/services/notifications/notifications.service.ts` — add `notifyAdminOfNewMember(user)`, same shape as the Phase 1 registration alert.
- **Edit** the invite-accept controller (wraps `invites.service.ts` `accept()`) — fire it fire-and-forget after the member account is created.
- **New** test coverage for the new composer.

## Not in this phase
- Anything from the parked engagement list.

## Done when
- [ ] Accepting an invite triggers an email to Carl naming the new member + their org.
- [ ] Free checks green: `npm test` + `npm run typecheck`.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Join alert arrives** — have someone accept an invite. You should get an email like "New member joined: <name> (<org>)". ❌ Not OK if nothing arrives.
2. **Accept flow unbroken** — the member still lands in the app normally even if the alert can't send.
