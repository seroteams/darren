# Phase 5 — Close out

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Walk the "Done means" list end-to-end and retire this folder.

## Changes
- Verify each "Done means" item in [PLAN.md](PLAN.md) and fix any miss found (docs-only).
- Move `docs/todo/cleanup-board/` to `docs/todo/done/cleanup-board/` once all phases are ✅.

## Not in this phase
- Nothing new. No API runs, no engine churn touched, no push.

## Done when
- [ ] All five "Done means" items hold.
- [ ] Folder moved to done/.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Clean commits** — `git log --oneline -5` then `git show --stat` on each of tonight's commits: only markdown/board files, nothing from the engine working tree. ❌ Not OK if any `src/`, `questions/`, `evals/` file appears.
2. **Five-section read** — open `SERO_BOARD.md` top to bottom. Now / Next / Parked / Cut / Done all read complete to you; nothing you care about is missing.
3. **One source of truth** — pick any plan file at random; it is the board or points at it within three lines.
