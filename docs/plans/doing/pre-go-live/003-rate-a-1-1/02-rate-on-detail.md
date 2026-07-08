# Phase 003 · Step 02 — Rate on the run detail

## Goal
On a reopened past 1:1, the manager can set/change a 1–5 star rating ("Did this help you run the 1:1?")
with an optional note.

## Technical detail
- Add `rateMyRun(id, { stars, note })` to [shared/api.js](../../../../shared/api.js) →
  `POST /api/v1/runs/mine/:id/rating`.
- In [run-detail.ts](../../../../admin/src/stages/run-detail.ts): a star control at the top of the detail —
  **keyboard-operable + labelled as a rating** (1–5 settable by arrow/number keys, visible focus, ≥14px).
  Pre-fill from `run.rating`. On a **low score (≤2)** reveal a one-line "What missed?" note field (same
  single note). Save calls `rateMyRun`; show a quiet "Saved" state; editable again.
- Copy stays plain; the note field is optional and never nags.

## Check
- `npm run typecheck` clean; `npm test` green. Rate a run → reload → the stars persist (verify the
  `rating.json` destination, not just the code). Keyboard sets the rating.
