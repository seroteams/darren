# Phase 1 — Modal shell

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

Every pop-up box in the app opens, traps the keyboard and closes the same way, from one piece of code.

## Why this one first

It is the worst drift and the least visible. `getFocusables` (the function that decides what your Tab key can reach inside a box) has been copy-pasted five times with **two different lists**. Two overlays have no keyboard trap at all, so Tab walks out of them into the page behind. Nothing on screen changes when this is fixed.

## Changes

- New `admin/src/ui/modal-shell.ts` — one `openModalShell()` owning the grey backdrop, the `aria-modal` labelling, the Escape key, the Tab wrap, returning focus to whatever you clicked, and click-outside-to-close. Returns `{ el, close }`.
- Refit the 7 boxes that hand-roll it: `confirm.js`, `add-person-modal.ts`, `delete-person-modal.ts`, `invite-member-modal.ts`, `give-access-modal.ts`, `share-link-modal.ts`, `finish-feedback-modal.js`.
- Bring in the 2 overlays with no trap today: `account-sheet.ts`, `stage-review.js`.
- Delete the 5 `getFocusables` copies. The wider list (the one in `confirm.js`, which includes links, selects and textareas) wins.
- New `admin/src/ui/modal-shell.test.ts` covering trap, Escape, focus restore.

## Not in this phase

- Restyling any box. Same markup, same words, same look.
- Toasts and the row menu. Different pattern, later.

## Done when

- [ ] `grep "modal-backdrop"` shows the string only inside `modal-shell.ts`.
- [ ] `grep "function getFocusables"` returns one result, not five.
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] Browser keyboard walk done and screenshotted.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > Team`

1. **Add someone** — click Add person. Press Tab repeatedly. You should stay inside the box and wrap back to the first field. ❌ Not OK if the highlight disappears behind the box.
2. **Escape works** — with that box open, press Escape. It closes, and the Add person button is highlighted again. ❌ Not OK if the page scrolls to the top or nothing is highlighted.
3. **Click outside** — open it again, click the grey area. It closes.
4. **Delete confirm** — try to remove a person. The confirm box opens with Cancel highlighted first, not Delete. Press Escape. Nothing is deleted.
5. **Account sheet** — open your profile menu, then Account. Tab around. You now stay inside it. ❌ Not OK if Tab escapes to the nav behind.
6. **Nothing looks different** — every box above should look exactly as it did before. Say so if anything shifted.
