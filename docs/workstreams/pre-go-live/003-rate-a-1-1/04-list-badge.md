# Phase 003 · Step 04 — Star badge on the Runs list

## Goal
Each rated run shows a small star badge on the Runs list; unrated rows stay clean (no nag).

## Technical detail
- In [runs.ts](../../../../admin/src/stages/runs.ts): the list payload now carries `rating` per run (Step 01).
  Render a compact `★ N` badge on rated rows; render nothing (or a faint "Rate" affordance later) for
  unrated. Keep the star/label ≥14px.

## Check
- `npm run typecheck` clean; `npm test` green. A rated run shows its stars on the list; unrated rows read
  clean.
