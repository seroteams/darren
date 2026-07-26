# Phase 3 — Button

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

One button. Today there are 226 places where someone typed the button's classes by hand, and no shared button exists at all.

## Changes

- New `admin/src/ui/button.ts` — `button({ label, variant, size, hook, type, disabled, iconLeft })`. Variants match what already exists in CSS: primary, ghost, danger.
- Sweep the raw strings, biggest files first: `stages/design.js` (16), `stages/briefing.js` (16), `stages/lexicon-review.js` (13), `stages/meeting-arcs.js` (10), `frontend/src/stages/guided/guided-stages.ts` (8), then the tail.
- Fold the off-system button families in, or record them in DESIGN.md as deliberate exceptions: `.wr-btn`, `.ds-btn-quiet`, the five `.row-menu-btn` variants, `.team-link`, `.copy-snippet-btn`, `.um-menu-btn`.

## This one can move pixels

Where a screen had drifted off the recipe, converging will change it slightly. That is the point, but it needs eyes. Before-and-after screenshots of at least one admin screen and one customer screen go in the phase file before Carl walks it.

## Not in this phase

- Changing what any button says.
- Changing the button colours or the primary-button contrast. Ruled twice, parked.

## Done when

- [ ] Raw `class="btn` strings outside `button.ts` are down to the recorded exemptions.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` clean.
- [ ] Before/after screenshots attached.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > Runs`

1. **Main action** — the blue Start button. Same colour, same size, same corners as before.
2. **Quiet action** — a ghost/outline button (Try again, Back). Same as before.
3. **Danger action** — the red Delete inside the remove-person box. Still red.
4. **Row menus** — click the three-dots menu on a run row. The items inside still look like menu items, not like big blue buttons. ❌ Not OK if any menu item turned into a solid button.
5. **Customer side** — `local > customer app > Home`. Buttons there match the admin ones.
6. **Anything that jumped** — scan the screens you use most and tell me anything that looks off, even slightly.
