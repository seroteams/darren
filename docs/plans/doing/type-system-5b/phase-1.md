# Phase 1 — The last 164

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Move every remaining type declaration out of component stylesheets and into a role, so the tenth guard rule can be an error at zero like the other nine.

## Changes
Same pattern the seven earlier phases used ~300 times: group the component selector into the role's selector list in `admin/src/styles/design/type.css`, and strip every type property from the component's own sheet in the same edit. Half-doing it silently half-applies, because the component sheets load later.

Three groups need something other than a role:

1. **`font-variant-numeric: tabular-nums`, 21 sites.** No role expresses this and one should not. `base.css`'s `.num-tabular` is the sanctioned escape hatch, so the fix is to pair that class in markup and delete the declaration. Where the element is not reachable from markup, say so and leave a waiver with the reason.
2. **`line-height: 1` on glyph containers.** `.type-flush` already exists for exactly this; group them in.
3. **`text-transform: capitalize` / `lowercase`.** These shape content, not size. They are not type in the sense the rule means. Either waive them explicitly with a reason in the linter header, or narrow the rule to the properties that are genuinely the ladder's business.

## Not in this phase
- The reading measure against DESIGN.md T5. Parked, one token.
- The phone heading collision. Parked, one rule.
- Radius and spacing. Different request; their ceilings stay untouched.

## Done when
- [ ] `node scripts/lint-design-tokens.js --json` reports `typePropOutsideTypeLayer: 0`
- [ ] The rule is an **error**, and `typePropOutsideTypeLayer` is deleted from CEILINGS
- [ ] Every waiver carries a written reason in the linter header
- [ ] Every size that changed on a real screen is listed with before and after, measured in the running app
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy`, `node scripts/test-design-guard.js` all clean
- [ ] Product owner has seen the list of size changes

## Test scenarios — for the product owner
**Setup:** `local > localhost:3943 > admin app` and `localhost:3945 > members app`

1. **Buttons everywhere** — Team, a run, a modal. Every button should look the size it did yesterday. ❌ Not OK if a button's text jumped.
2. **Pulse dashboard** — the big numbers should still line up in a column as they change. ❌ Not OK if digits jiggle sideways.
3. **The Design system page** — it holds the most changes of any single screen. Everything should look deliberate. ❌ Not OK if a heading or label looks the wrong size.
4. **A guided run on the members app** — text, chevrons and the stepper. ❌ Not OK if an arrow or icon changed size.
5. **The list I give you** — every size that moved, with before and after. Read it and say if any of them is wrong.
