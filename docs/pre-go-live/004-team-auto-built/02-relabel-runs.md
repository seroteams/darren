# Phase 004 · Step 02 — Relabel "Runs" → "Past 1:1s"

## Goal
Person-centric is the return-visit mental model, so the flat list becomes the secondary "Past 1:1s" view.

## Technical detail
- [app-nav.js](../../../admin/src/ui/app-nav.js): the member `runs` nav item label "Runs" → **"Past 1:1s"**.
- [runs.ts](../../../admin/src/stages/runs.ts): the page heading "Runs" → **"Past 1:1s"** (keep the
  subtitle). "Runs" stays the internal/admin word (Library etc. unchanged).

## Check
- `npm run typecheck` clean; `npm test` green. The member rail reads "Past 1:1s"; the page heading matches;
  admin screens untouched.
