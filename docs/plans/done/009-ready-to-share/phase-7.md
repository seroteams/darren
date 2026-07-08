# Phase 7 — Tidy docs + newcomer README

**Part of:** [PLAN.md](plan.md) · **Track:** B (repo-ready) · **Status:** ⬜

## Goal
A newcomer opens the repo and finds their way — trackers don't contradict each other, dead files are gone,
and a README walks them from clone to first run.

## Changes
- Finish [tracker-consolidation](../tracker-consolidation/plan.md) Phases 2–4: demote PROGRESS.md to an
  append-only log, mark the how-it-works page as a manual changelog, simplify CLAUDE.md §6 to two sources.
- A conventions sweep: file naming (kebab-case + role suffix) as touched, remove dead code we can prove is
  dead, split any remaining oversized files, no stray `any`/ignores.
- A top-level README a newcomer can actually follow: what Sero is, how to run it, where to look.
- Make sure member-nav (and any other new plan) is listed where it belongs so the tracker count is honest.

## Not in this phase
- Big refactors — surgical cleanups only.
- Renaming/moving tracker files (tracker-consolidation changes roles/headers, not locations).

## Done when
- [ ] Opening any subordinate tracker, within 5 seconds it's clear it is NOT where you check status.
- [ ] CLAUDE.md §6 names two status sources; the keep-many-in-sync rules are gone.
- [ ] A newcomer can follow the README to a running app.
- [ ] `npm test` green; no obvious dead files or `any` escapes left.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Which file is status?** — Open PROGRESS.md and the how-it-works page. Each should say, up top, "not a status source — see STATUS.md". ❌ Not OK if either still reads like a rival status board.
2. **Newcomer walk** — Follow the README from the top as if new. You should reach a running app without insider knowledge. ❌ Not OK if a step assumes something not written down.
3. **Honest trackers** — Every active plan folder (incl. member-nav) is listed in STATUS.md's parked/active list. ❌ Not OK if a plan exists on disk but nowhere in the tracker.
