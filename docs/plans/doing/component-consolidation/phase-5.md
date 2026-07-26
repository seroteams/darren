# Phase 5 — Chip and form field

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

One little status pill, and one text input.

The chip **CSS** is already solved and guarded by `admin/src/styles/design/chip-system.test.ts`. The markup half is not: eight separate functions build chips by hand. Form fields have three parallel systems, and the evidence of the mess is that a customer page imports a **modal's** stylesheet just to borrow an input recipe.

## Changes

- New `admin/src/ui/chip.ts` — replaces the 8 hand-rolled chip functions in `admin-feedback.ts`, `run-detail.ts`, `start-core.js` (three of them), `briefing-view.ts`, `member-home-view.ts`.
- New `admin/src/ui/field.ts` — collapses `.field`, `.apm-field` and `.ds-input` into one recipe.
- Remove `frontend/src/stages/member-home.js`'s import of `admin/src/styles/add-person-modal.css`. That dependency only exists to steal an input style.
- Fold in the off-system chip families: `.fp-chip`, `.gd-chip`, `.pl-chip`, `.arc-chip`, `.g-arc-chip`.

## Lane check before starting

`design/primitives.css` is held by session `4b899314`. If still live, do the chip work and hold the field work.

## Not in this phase

- Changing any chip's colour meaning. Green stays green.
- The segmented controls (`.seg` and its five rivals). Separate pattern, not scoped here.

## Done when

- [ ] The 8 chip functions are gone; `chip.ts` is the only builder.
- [ ] `member-home.js` no longer imports a modal stylesheet.
- [ ] `chip-system.test.ts` still passes.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens` clean.
- [ ] Before/after screenshots attached.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > Admin > Feedback`

1. **Chips readable** — the type and status pills on each feedback row. Same height, same corner radius, text still readable. ❌ Not OK if any text got smaller than the body text around it.
2. **Chip meaning** — a "done" chip is still the same colour it was; a "new" chip likewise.
3. **Run detail** — open any run. The read/unread chip matches the ones on Feedback.
4. **Forms** — Team > Add person. The name and email boxes look the same as the boxes on the customer Home screen. ❌ Not OK if one has a border and the other doesn't, or the heights differ.
5. **Typing still works** — fill in Add person and save. The person appears in the list.
