# Phase 002 · Step 03 — Make the Runs rows open their detail

## Goal
Clicking a row on the Runs list opens that 1:1's read-only detail.

## What you'll have
- Each Runs row is a real, keyboard-operable button that opens `RUN_DETAIL` for its run id.

## Technical detail
- In [runs.ts](../../../../admin/src/stages/runs.ts), render each row as a `<button type="button"
  class="card-flat runs-list__row" data-id="…">` and wire clicks (delegate) →
  `setState({ myRunId: id, stage: STAGES.RUN_DETAIL })`.
- Add a small `.runs-list__row` rule to [design.css](../../../../admin/src/styles/design.css): reset the
  button to read as a card row (`display:block; width:100%; text-align:left; font:inherit; color:inherit;
  cursor:pointer`) + a `:hover` using `var(--sero-active-state-bg)`. Global `:focus-visible` already gives
  the focus ring — so it's keyboard-accessible for free.

## Check
- `npm run typecheck` clean; `npm test` green. Click a row → the detail opens; Tab + Enter opens it too;
  Back returns to the list.
