# Phase 002 · Step 01 — Add the "open one of my runs" API call

## Goal
One small client function to fetch a single run the member owns, read-only.

## What you'll have
- `getMyRun(id)` in [shared/api.js](../../../../shared/api.js), beside `listMyRuns()` → `GET
  /api/v1/runs/mine/:id`, returning `{ id, headline, ctx, briefing, lastSeenAt, completedAt }`.

## Technical detail
```js
export async function getMyRun(id) {
  return json(await fetch(`/api/v1/runs/mine/${encodeURIComponent(id)}`));
}
```
- Reuses `json(...)` (throws on non-OK — the page's error state catches it).
- Backend already exists: `runs.mineDetail` → `service.myRun` → `memberRunView` (fenced by org **and**
  user; a run you don't own → 404).

## Check
- `npm run typecheck` clean; `npm test` green (no backend change).
