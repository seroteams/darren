# Phase 4 — House in step

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built (code part), trackers close at sign-off

## Built (2026-07-19)
Dependency sweep: frontend app imports admin's briefing.js + state.js → frontend rehydrate patched (see phase 2); past-run views (briefing-view.ts, run-detail.ts) already promises-aware, untouched; /test gallery: the new "Promises before the recap" walk IS the shipped design's mirror; old "Promises loop" walk blurb now notes its wrap step is superseded (walk kept for the loop story). lint:tokens fails on 25 PRE-EXISTING violations (recap-pdf COLOR block + profile-badge.js — none from this diff; verified `git diff` adds no raw colours). Trackers/changelog move at Carl's green light via phase-close.

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
