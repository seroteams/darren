# Phase 4 — Clear the QA pile

**Part of:** [PLAN.md](PLAN.md) · **Track:** A (ship-blocker) · **Status:** ⬜

## Goal
Nothing half-finished is visible to an alpha user. Every feature that was built but never QA'd is either
walked, signed off, and kept — or cut from view.

## Changes
- Walk each built-but-unsigned feature through its own QA scenarios and decide keep-or-cut:
  sent-preview, see-before-sent, stage-data-tabs, briefing-readability, todo-board-rebuild.
- Kept features: confirm they work end to end and close their plans to `done/`.
- Cut features: hide/remove them from the alpha surface (code can stay, just not on screen), and note the
  decision in the relevant plan's Parked section.

## Not in this phase
- Building anything new — this is finish-or-hide only.

## Done when
- [ ] Each listed feature is either signed off (works end to end) or not visible to an alpha user.
- [ ] No screen shows a broken or clearly unfinished feature.
- [ ] Each feature's plan folder reflects the decision (closed to done/, or Parked note).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Click everything** — As an alpha user, click through every visible feature/tab. Each should do something complete. ❌ Not OK if any feels half-built or errors.
2. **The cut list** — I show you the list of features we decided to hide for alpha. You should agree none of them are needed for a first real run. ❌ Not OK if something important got hidden.
3. **Plans match reality** — For each kept feature, its plan folder is in `done/`; for each cut one, there's a Parked note. ❌ Not OK if a plan still says "awaiting QA" for something now live.
