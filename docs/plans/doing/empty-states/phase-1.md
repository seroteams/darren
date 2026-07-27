# Phase 1 — Un-quiet the rail

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A manager with zero 1:1s sees the full manager rail from their first login.

## Changes
- `frontend/src/ui/app-nav.js` — remove the quiet-rail gate (the `quiet` flag and its `isFirstVisit()` check); manager rows always show. The first-visit subscription that re-renders the rail goes with it.
- `frontend/src/ui/app-nav-quiet.test.ts` — retire the quiet-rail cases; keep the first-visit module's own tests where they still guard Home's behaviour (or move them beside `first-visit.ts`).
- `admin/src/ui/first-visit.ts` stays untouched — Home's first-run hero still reads it.

## Not in this phase
- Any copy or styling change to the Team / Past 1:1s / Members empty states (Phase 2).
- Any change to Home, the member rail, or the admin app's rail.

## Done when
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] Screenshot of a zero-run manager on localhost:3002 showing the full rail (real render, not code).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Fresh manager sees everything** — `local > customer app (localhost:3002) + log in as carl+9` (or any zero-run manager). The left rail shows Home, Start 1:1, Team, Past 1:1s, and Members near the foot. ❌ Not OK if any of those rows are missing.
2. **Pages open, nothing breaks** — click Team, then Past 1:1s, then Members. Each opens a page with a simple "nothing here yet" card (today's wording — the new look is Phase 2). ❌ Not OK if any page errors or sits blank.
3. **Home unchanged** — click Home. You still get the "Prep your first 1:1" welcome you have now.
