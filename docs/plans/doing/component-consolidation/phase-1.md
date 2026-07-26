# Phase 1 — Modal shell

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-07-26)

**New:** [admin/src/ui/modal-shell.ts](../../../../admin/src/ui/modal-shell.ts) — `openModalShell()` (builds backdrop + card) and `attachModalBehaviour()` (for overlays that own their own DOM), plus one exported `getFocusables`.

**Refitted, 9 modules:** `confirm.js`, `add-person-modal.ts`, `delete-person-modal.ts`, `invite-member-modal.ts`, `give-access-modal.ts`, `share-link-modal.ts`, `finish-feedback-modal.js`, `account-sheet.ts`, `stage-review.js`. Net **-216 lines** across them.

**Guard:** [admin/src/ui/modal-shell.test.ts](../../../../admin/src/ui/modal-shell.test.ts), 8 source-reading assertions in the same shape as `design/chip-system.test.ts` (this runner is `node:test` with no DOM, so real keyboard behaviour is proved in the browser below and generalised into a linter in Phase 8).

### Offline proof

| Check | Result |
|---|---|
| `npm test` | 194/194 passed (baseline before the work: 191/191) |
| `npm run typecheck` | clean |
| `npm run lint:tokens` | PASS, no hard violations |
| `npm run lint:copy` | PASS, no em dashes |
| `grep "function getFocusables"` | 2 hits: `modal-shell.ts` and its own test. Was 5 copies. |
| `grep '"modal-backdrop"'` | only `modal-shell.ts` and its test |

No paid run was needed or used.

### Browser proof (localhost:3343, admin, DEV_AUTOLOGIN)

Every dialog driven for real: opened, Tab dispatched from the last control, Escape dispatched, `document.activeElement` read back.

| Dialog | aria-modal + labelled | Tab wraps | Escape closes | Focus returns |
|---|---|---|---|---|
| Add person | ✅ | ✅ | ✅ | ✅ |
| Delete person (alertdialog) | ✅ | ✅ | ✅ | ✅ |
| Invite member | ✅ | ✅ (the `<select>` is now in the trap) | ✅ | ✅ |
| Give access | ✅ | ✅ | ✅ | ✅ |
| Share link | ✅ | ✅ **new, had no trap** | ✅ | ✅ |
| Finish feedback | ✅ | ✅ | ✅ | ✅ |
| Confirm / alert | ✅ | ✅ | ✅ (resolves false) | ✅ |
| Account page | ✅ | ✅ **new, had no trap** | ✅ | n/a, see below |
| Stage review | ✅ | ✅ **new, had no trap** | ✅ | ✅ |

Confirm also checked: destructive starts on Cancel, non-destructive starts on Confirm, the button resolves true, alert has no Cancel and uses `alertdialog`.

Chrome unchanged (computed styles, Add person): backdrop `fixed` / `grid` / centred / `rgba(31,42,55,0.45)` / z-index 40; card `rgb(253,254,254)`, radius 12px, width 440px; primary button `rgb(90,169,230)`, radius 4px, 16px text. All the same recipe as before.

### Two honest notes

- **A bug I introduced and then caught in the browser:** my first cut counted `[hidden]` controls as focusable. On the account page that put an unfocusable element last in the list, so the wrap never fired and Tab still escaped. `getFocusables` now filters on `getClientRects()`. Code review would not have caught it; driving the real page did.
- **Not fixed, pre-existing:** closing the account page leaves focus on `<body>`, because the profile-menu item that opened it has already been removed from the DOM. The old code did the same. Worth a later fix, out of scope here.
- **Unrelated console error seen while testing:** `skeleton-parts.ts does not provide an export named 'skBox'` — that is another session's in-flight work (lane `70b40d36`), not this phase.


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
