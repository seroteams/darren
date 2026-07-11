# Phase 3 — Rating stage + history

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day

## Goal
The Rating stage captures the member's spoken six-block self-scores (manager types them in) and shows how they compare to past sessions.

## Changes
- Migration: `block_scores` table (see plan.md data model; unique per session+block).
- Rating stage UI (`stage-rating.component.ts`): six blocks — Tasks · Processes · Our team · Development · Fun · Fulfilment — each a 1–10 stepper (+/- controls like the old-Sero screenshot) with an optional "Add note" per block, and a computed session average at the end of the row.
- History below the entry row (decision 15, per the old-Sero "Building block ratings" screenshot): an **Averages** row (per-block averages, with delta vs the entry in progress), then collapsible past-session rows (date + six scores + their average). Data via `GET /api/v1/people/:personId/block-scores`.
- `POST /guided-sessions/:id/complete` upserts `block_scores` from `state.ratingDraft` (idempotent on the unique key).
- Guided copy makes the protocol explicit: "Ask {name} to rate how they feel about each area — you type in their numbers." (decision 7 — the scores are the member's own, spoken aloud.)

## Not in this phase
- Feedback/wrapup UIs, AI calls, record template, trend charts (tabular history only).

## Done when
- [ ] Six `block_scores` rows in the DB after finishing a session with ratings (query the table)
- [ ] `npm run typecheck` + `npm test` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Scores stick and history grows** — Meeting A: enter six scores + one note, finish. Meeting B (same person): the Rating stage shows Meeting A's scores in the history rows and per-block averages above them. ❌ Not OK if history is empty or averages are wrong.
2. **Collapse/expand** — the past-ratings block collapses and expands ("Hide past ratings" toggle) and the stage stays usable on a laptop screen.
3. **Bad input rejected** — try to enter 0, 11, or blank. You get an inline correction, not a save. ❌ Not OK if an out-of-range score reaches the DB.
