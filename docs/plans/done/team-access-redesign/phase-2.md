# Phase 2 — One clean "Give access" flow

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-14 — Carl walked the new sheet ("go")
One "Give access" sheet does link + invite (+ remove when linked) — the two split controls are gone. Committed. Final phase, so the workstream is complete.

## Built (2026-07-14)
- **New `admin/src/ui/give-access-modal.ts`** — one sheet titled "Give <name> access" (or "<name>'s access" when linked). Offers both paths in one view: **Link an existing account** (dropdown of company accounts) + **or invite by email** (→ one-time join link), plus **Remove access** when already linked. Reuses the shared modal shell + `apm` styles + focus-trap. Resolves `{kind:"link"|"invite"|"unlink"}` or null. *(Deviation from the plan: lives in `admin/src/ui/` beside `add-person-modal.ts`, not `frontend/src/ui/` — that's where the sibling modals + the CSS live and where `team.ts` already imports from.)*
- **`team.ts`** — the card's access button now opens this one sheet; the two old paths (`doInvite`'s `window.prompt` + `doLink`'s dropdown/row-menu) collapse into a single `doAccess`. The Phase-1 interim row-menu and the `RowMenuItem` import are gone.
- **Offline proof:** all 3 typechecks clean · `npm test` **133/133** (the Phase-1 card test still passes — the card markup is unchanged, only the click target's behaviour moved). The modal is DOM-only, so like its siblings (`add`/`delete-person-modal`) it has no unit test — proof is typecheck + suite + your walk.
- **Not committed** — waiting on your walk.

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
