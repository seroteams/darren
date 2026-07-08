# Phase 2 — Demote PROGRESS.md

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Make `docs/prototype-to-production/progress.md` unmistakably an append-only decisions +
lessons log, so no one reads it as a status board (it's the one that keeps going stale).

## Changes
- Add a clear header at the top: "This is an append-only log of decisions and lessons.
  It is NOT the status source — for where we are, see STATUS.md and SERO_BOARD.md."
- Remove or clearly mark any phase-status table inside PROGRESS.md that competes with
  STATUS.md (the drift-prone part). Keep the historical decision entries.

## Not in this phase
- The changelog and CLAUDE.md (Phases 3–4).
- Deleting historical content — we relabel and de-status it, we don't erase the log.

## Done when
- [ ] PROGRESS.md opens with a banner pointing to the two real status sources.
- [ ] No live status table inside PROGRESS.md that can disagree with STATUS.md.
- [ ] Existing decision/lesson history is intact.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **First impression** — open PROGRESS.md. The top should tell you, plainly, "this isn't where you check status — go to STATUS.md." ❌ Not OK if it still looks like a progress dashboard.
2. **History survived** — scroll down. The old decisions and lessons are still there. ❌ Not OK if anything historical was deleted.
3. **No contradiction** — find any phase mentioned in both PROGRESS.md and STATUS.md. They should not state conflicting status (because PROGRESS no longer states status at all).
