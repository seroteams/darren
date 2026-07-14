# Phase 2 — One clean "Give access" flow

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Replace the two overlapping access controls (a separate "Invite by email" button *and* an account dropdown) with a **single "Give access" sheet**: one place to either invite someone by email or link an existing company account.

## Changes
- New `frontend/src/ui/give-access-modal.ts` (sibling of `add-person-modal.ts`): a small sheet titled "Give <name> access" with two clearly-labelled paths in one view —
  - **Link an existing account** — pick from the company accounts (the `getLinkableUsers` list).
  - **or invite by email** — type an address → one-time join link (today's `invitePerson`).
  - One confirm. Explains once: "They'll see the list of their own 1:1s — dates and types, never your notes."
- `team.ts`: the card's "Give access" / "Change" button opens this one modal instead of the prompt-or-dropdown. Remove the inline dropdown + separate invite prompt paths left over from Phase 1.

## Not in this phase
- Person-merge (parked).
- Any wording/flow change to Prep / Edit / Delete.

## Done when
- [ ] "Give access" opens one sheet offering both link-existing and invite-by-email; there is no longer a separate always-visible dropdown or a bare `window.prompt`.
- [ ] Both paths still land the real link (verify via reload/API that the person is linked to the chosen/created account).
- [ ] `npm test` green + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **One door** — click **Give access** on an unlinked person. You should see a single sheet with both "link an existing account" and "invite by email" — not two separate controls. ❌ Not OK if you still see a loose dropdown + a separate Invite button.
2. **Link path** — in the sheet, pick an existing account and confirm. The card should show 🔗 that account. ❌ Not OK if it doesn't link.
3. **Invite path** — in the sheet, choose invite-by-email, enter an address, confirm. You should get the one-time join link to send. ❌ Not OK if no link appears.
4. **Change** — on a linked person, **Change** opens the same sheet, pre-set to their current account, and lets you switch or remove. ❌ Not OK if Change behaves differently from Give access.
