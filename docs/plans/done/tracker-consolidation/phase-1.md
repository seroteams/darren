# Phase 1 — The map

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Write one short reference that says, plainly, which file is for what — so there's a
single agreed picture before we touch any tracker.

## Changes
- Add a short **"Where things live"** reference (a section at the top of STATUS.md, or a
  tiny `docs/reference/trackers.md` — pick whichever Carl prefers in review). It lists all five
  files and, for each, one line: *is this a status source? if not, what is it, and where
  do I look instead?*
- No other file changes this phase. This is the agreement step.

## Not in this phase
- Editing PROGRESS.md, the changelog, the badges, or CLAUDE.md — those are Phases 2–4.

## Done when
- [ ] The reference exists and names exactly two status sources (STATUS.md, SERO_BOARD.md).
- [ ] Each of the other three files has a one-line "what it actually is" entry.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The 5-second test** — open the new reference. Ask yourself "where do I check where we are right now?" You should land on STATUS.md immediately, with SERO_BOARD.md as the big-picture one. ❌ Not OK if it's still ambiguous which file to trust.
2. **Each file has a role** — for PROGRESS.md, the changelog, and the badges, the reference should answer "is this status? no — it's X". You should not be left guessing what any of the five is for.
3. **Nothing new to maintain** — the reference should feel like *less* to keep updated, not another tracker. ❌ Not OK if it reads like a sixth thing to sync.
