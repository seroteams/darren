# Phase 002 — Reopen a run

## Goal (plain)
Let a manager click any past 1:1 in their Runs list and re-read it — a clean, read-only version of the
briefing Sero prepared, so nothing is a dead end.

## What you'll have when it's done
- Clicking a run in the Runs list opens a **read-only briefing** view: who it was about, the prep, and
  the final briefing — the same content the manager saw at the end of that 1:1.
- It is **read-only** — this is for re-reading, not the admin QA verdict tools (those stay admin-only).
- The fence holds: a manager can only open a run they own.

## A grounding example (before → after)
- **Before:** the Runs list shows rows, but there's nowhere to go when you click one.
- **After:** click "Priya · Senior Engineer · 2 days ago" → the full briefing opens, exactly as it read
  after that meeting, with a "back to Runs" link.

## The steps (to be detailed when this phase starts)
1. Add `getMyRun(id)` to [shared/api.js](../../../shared/api.js) → `GET /api/v1/runs/mine/:id`.
2. New member run-detail stage (register via the stage pattern: `state.js` + `router.js` guard +
   `main.js` loader). Route like `/runs/:id`.
3. Reuse the read-only briefing render from [review-run.js](../../../admin/src/stages/review-run.js) —
   **minus** the admin verdict widget / keyboard QA tools.
4. Wire each Runs list row (from Phase 001) to open its detail.

## What we reuse (don't rebuild)
- `runs.mineDetail` → [runs.controller.ts:73](../../../backend/api/services/runs/runs.controller.ts) →
  `service.myRun` → `memberRunView` (returns `{ id, headline, ctx, briefing, lastSeenAt, completedAt }`,
  fenced by org+user, 404s a run you don't own).
- review-run.js's briefing markup for the read-only parts.

## Notes (from the CTO review)
- **Surface `next_actions` + `watch_for` prominently** in the read-only view — they're the "what you
  agreed / what to watch" the next visit builds on (Phase 005's "Since last time" reuses the same fields).
- **The member view is briefing-only:** `memberRunView` returns the `briefing` + `ctx`, not the raw
  prep/focus/transcript that the admin readers carry. Render the briefing shape; don't assume the richer
  admin fields are present, and never fall through to the admin/QA readers here.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Clicking a run opens its briefing read-only; "back" returns to the list.
- A member cannot open another member's run id (404), even by typing the URL.
- No OpenAI calls; `npm test` + `npm run typecheck` stay green.

> **Status:** overview only. Detailed step files get written when we start this phase.
