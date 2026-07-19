# Phase 4 — House in step

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every surface that shows the promises flow matches the shipped design, and the trackers say so.

## Changes
- `admin/src/stages/tests/promises-loop.js` — scene 2 ("Before we wrap") becomes a mirror of the real dedicated screen (two groups, move, lock) so the /test gallery walk demos the shipped thing.
- Dependency sweep (dependency-check skill): both apps, test-engine page, past-run views, content — confirm nothing else renders next_actions/promises stale.
- Trackers: plan statuses, STATUS.md, changelog/deck if warranted; move folder to done/.

## Not in this phase
- Nothing new — this is the tie-off.

## Done when
- [ ] /test gallery walk scene 2 visually matches the shipped Promises screen (screenshot both).
- [ ] Dependency sweep notes recorded here.
- [ ] Product owner has tested the scenario below and said go.

## Test scenarios — for the product owner
`local > admin (email+pass) > /test > "Promises loop in the runner"`
1. **Gallery matches reality** — walk the demo to scene 2. It should look like the real promises page you approved. ❌ Not OK if it still shows the old single-list card.
