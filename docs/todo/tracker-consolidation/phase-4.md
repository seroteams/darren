# Phase 4 — Lock the rules

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Shrink CLAUDE.md §6 to the simple two-source model now that the subordinate files
declare their own roles — so the rulebook stops growing to keep five things in sync.

## Changes
- Rewrite the relevant CLAUDE.md §6 rules: name **two** status sources (STATUS.md +
  SERO_BOARD.md), state that PROGRESS.md / the changelog / the badges are subordinate
  and self-describe their role, and delete the now-redundant "keep all five in sync"
  instructions.
- Confirm the build badges (`admin/src/stages/tasks.js`) are described as *build status
  per step* (a UI feature), not a competing status narrative — adjust the wording in
  §6 if needed. No code change to tasks.js expected.

## Not in this phase
- Any further restructuring; this closes the plan.

## Done when
- [ ] CLAUDE.md §6 is shorter and names exactly two status sources.
- [ ] The redundant five-way-sync rules are gone.
- [ ] Badges are described as build-status-only, not a status source.
- [ ] Product owner has tested the scenarios below and said go
- [ ] On green light: move `docs/todo/tracker-consolidation/` → `docs/todo/done/`

## Test scenarios — for the product owner
Walk through these yourself. This closes the plan on your green light.
1. **Shorter rulebook** — re-read CLAUDE.md §6. It should be noticeably tighter and say "two sources of truth: STATUS.md + SERO_BOARD.md." ❌ Not OK if it still lists five things to keep in sync.
2. **One question, one place** — pick any "where are we" question. The rules should send you to exactly one file, with no "also check these three."
3. **Badges make sense** — the rules should describe the build-plan badges as showing build progress per step, clearly separate from the two status trackers. ❌ Not OK if badges still read as a rival status source.
