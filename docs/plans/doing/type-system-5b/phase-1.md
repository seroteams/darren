# Phase 1 — The last 164

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting sign-off

## Goal
Move every remaining type declaration out of component stylesheets and into a role, so the tenth guard rule can be an error at zero like the other nine.

## Changes
Same pattern the seven earlier phases used ~300 times: group the component selector into the role's selector list in `admin/src/styles/design/type.css`, and strip every type property from the component's own sheet in the same edit. Half-doing it silently half-applies, because the component sheets load later.

Three groups need something other than a role:

1. **`font-variant-numeric: tabular-nums`, 21 sites.** No role expresses this and one should not. `base.css`'s `.num-tabular` is the sanctioned escape hatch, so the fix is to pair that class in markup and delete the declaration. Where the element is not reachable from markup, say so and leave a waiver with the reason.
2. **`line-height: 1` on glyph containers.** `.type-flush` already exists for exactly this; group them in.
3. **`text-transform: capitalize` / `lowercase`.** These shape content, not size. They are not type in the sense the rule means. Either waive them explicitly with a reason in the linter header, or narrow the rule to the properties that are genuinely the ladder's business.

## What landed (2026-07-31)

**164 to 0, measured after every one of the six biggest files** so a half-application could
not hide: 164 → 126 (buttons-inputs + base) → 109 (design-stage) → 97 (stage-extras) → 80
(test-engine + admin-pulse) → 58 (stage-review + start-stage + pulse-drilldowns) → 31 → **0**.
Every step fell by exactly what that file held.

`type-property-outside-type-layer` is now an **error** in `scripts/lint-design-tokens.js`, and
`typePropOutsideTypeLayer` is **deleted** from `CEILINGS` in `scripts/test-design-guard.js`.
Its dead `TYPE_RULE_BY_KEY` branch and eleven now-unreachable HINTS went with it. Two ceilings
remain, `literalRadius` and `offGridSpacing`, both untouched: a different request.

### How the three special groups were answered

1. **Tabular figures went to `.num-tabular`, but by GROUPING, not by markup.** The class moved
   from `base.css` into `type.css` and twenty component selectors were grouped into it. Pairing
   the class in markup would have been twenty edits across fourteen JS and TS files, three of
   which sit in other sessions' lanes, and it contradicts the joining rule `type.css` states for
   every other treatment: "a screen joins by having its component selector grouped into a role
   below", not by adding a class to markup. No waiver was needed and none was taken.
2. **`.type-flush` took five more glyphs.** Two more values sit beside it with their own reasons:
   `line-height: 0` for `.ud-chev` and `.row-menu-btn`, whose line box must collapse entirely
   rather than stop at the glyph, and `0.7` for the guided slider's caret. All three used to sit
   in component sheets with comments saying `.type-flush` was the wrong value for them. That was
   true, and it was not a reason to sit outside the layer.
3. **The text-transform call, made and stated.** `uppercase` IS a type level: `.type-overline` is
   built out of it. So the three caps badges that are not eyebrows took a new grouped treatment,
   `.type-caps` (uppercase + the house 0.02em), inside the layer. `capitalize` and `lowercase`
   REWRITE the words rather than sizing them, so they cannot be a rung and there is nothing for a
   role to carry: those two are waived by line with their reason. Narrowing the rule to drop
   `text-transform` was rejected, because it would have taken `.type-overline`'s own uppercase
   out of the layer with them.

### What is in type.css that is not a role

No new role was added. Five labelled non-role sections were, each saying why:

- **the document default** (`body`, and `input/textarea/button/select`), moved from `base.css`.
- **the control tier**: `.btn`/`.btn--md` (16/24/500), `.btn--lg` (18/28), `.input` (24/32). No
  reading role is medium weight at 16 or 18: `.type-body` would flatten every primary button in
  the app to 400 and `.type-heading-xs` would embolden it to 600. `.btn--sm` already proves the
  shape, sitting in `.type-label` since P3.
- **glyph geometry**: ten sizes that draw a picture rather than set text.
- **the weight-only section**: ~35 selectors that adjust the weight and let the context decide
  the size. It is also the pressure gauge: fourteen of them want medium weight at a size the
  ladder only carries at 14px, and the comment says that if the list grows again the answer is a
  medium tier at 16 and 18, not a fifteenth line.
- **`.type-caps`** and **`.num-tabular`**.

### A defect the measuring found

`.auth-split .link` (the quiet links on sign-in and join) rendered at weight **400 instead of
600** after the move, and the CSS diff read perfectly clean. `auth.css` had `font: inherit` on
that selector: the shorthand resets font-weight, it loads after `type.css`, and it beats a
same-specificity rule there on source order. Fixed by writing the three properties the link
genuinely has to inherit as longhands and leaving the weight to the layer. Re-measured live:
16/24/600 Inter, before and after. Written into DESIGN.md as the trap, because the linter cannot
see it: a CSS-wide keyword sets no type value, so `font: inherit` is legally invisible to the
rule while being able to defeat it.

### Files
`admin/src/styles/design/type.css` (the sheet everything moved into) and 30 component sheets;
`admin/src/stages/meeting-arcs.js` and `frontend/src/stages/guided/guided.page.ts` (two inline
styles that became classes); `scripts/lint-design-tokens.js`, `scripts/test-design-guard.js`,
`scripts/test-type-rules.js`; `DESIGN.md`.

## Not in this phase
- The reading measure against DESIGN.md T5. Parked, one token.
- The phone heading collision. Parked, one rule.
- Radius and spacing. Different request; their ceilings stay untouched.

## Done when
- [x] `node scripts/lint-design-tokens.js --json` reports `typePropOutsideTypeLayer: 0`
- [x] The rule is an **error**, and `typePropOutsideTypeLayer` is deleted from CEILINGS
- [x] Every waiver carries a written reason in the linter header (five files, six lines)
- [x] Every size that changed on a real screen is listed with before and after, measured in the running app. [proof/p5b-measurements.md](proof/p5b-measurements.md)
- [x] `npm test` (221/221), `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy`, `node scripts/test-design-guard.js` all clean
- [ ] Product owner has seen the list of size changes

## Test scenarios — for the product owner
**Setup:** `local > localhost:3943 > admin app` and `localhost:3945 > members app`

1. **Buttons everywhere** — Team, a run, a modal. Every button should look the size it did yesterday. ❌ Not OK if a button's text jumped.
2. **Pulse dashboard** — the big numbers should still line up in a column as they change. ❌ Not OK if digits jiggle sideways.
3. **The Design system page** — it holds the most changes of any single screen. Everything should look deliberate. ❌ Not OK if a heading or label looks the wrong size.
4. **A guided run on the members app** — text, chevrons and the stepper. ❌ Not OK if an arrow or icon changed size.
5. **The list I give you** — every size that moved, with before and after. Read it and say if any of them is wrong.

### What the measurements already say about each

1. All seven button variants read identically before and after, at 1280px and at 390px.
2. The KPI number is unchanged and keeps its tabular figures. Its small denominator changes
   TYPEFACE, Bricolage to Inter, which is the T6 rule the system already had.
3. 2,013 elements read twice: four change, all the same coaching-phrase line spacing.
4. Every guided element reads identically, including the chevron, the stepper and the caret.
5. Eight rows, in the proof file. Nothing changes size and nothing changes weight.

## Two things worth Carl's eye rather than a tick
- The eight changes are all sub-pixel spacing or one typeface swap. If any of them is wrong, it
  is row 1: the Pulse denominator now sets in Inter rather than Bricolage.
- 22 selectors picked up `text-wrap: pretty` with the body role, which only affects whether the
  last line of a paragraph is left with one word on it. It was kept rather than suppressed;
  suppressing it would mean those selectors took a role's face and refused its wrapping, which is
  the half-application this plan exists to stop.
