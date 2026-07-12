# Phase 3 — Rating sliders + last-time markers

**Part of:** [plan.md](plan.md) · **Status:** 🔨 BUILT — awaiting Carl's QA walk (`d7eef92a`) · **Size:** ~1 day

## Goal
The Rating stage captures the member's spoken six-block self-scores on real sliders (manager drags), each slider marked with last session's score and date, and finishing the session writes them to `block_scores`.

## Changes
- Migration: `block_scores` table (see plan.md data model; score numeric(3,1), unique per session+block).
- Rating stage goes live-data: six slider cards exactly like the prototype — icon, block name + ⓘ, big live score top-right, slider 1–10 step 0.5, labels "1 Low score / 5 Normal / 10 Thriving", optional note per block.
- **Last-time marker**: previous completed session's score for that block + its date rendered above the track ("7.0 · 9 Jun 2026 ▾"), positioned by value; no marker on a person's first session (clean, not a fake 0).
- Draft scores auto-save into `state.ratingDraft`; `POST /guided-sessions/:id/complete` upserts `block_scores` (idempotent on the unique key). Range-validated in the service (1.0–10.0, 0.5 steps) — bad values rejected, never stored.
- `GET /api/v1/people/:personId/block-scores` returns per-person score history (used for the marker now, the record's trend in Phase 6).
- Guided copy states the protocol: "Ask {name} to rate how they feel about each area — she says the number out loud, you type it in."

## Not in this phase
- Full history table (averages + past sessions) — parked. Feedback/wrapup persistence, AI, record.

## Done when
- [x] `block_scores` rows in the DB after finishing a session with ratings — verified via a real local-Neon round-trip: complete() wrote 3 rated blocks (7.5/8/6) + a note → a later session read them back as markers → score 11 rejected, nothing stored, session left open → rows cleaned up
- [x] `npm run typecheck` + `npm test` green (typecheck clean · **131/132**; the 1 fail is the known-environmental `test-persona-bench`)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Scores stick, markers appear** — Meeting A: set six scores + one note, finish. Meeting B (same person): every slider carries A's score as the little marker with A's date. ❌ Not OK if markers are missing or wrong.
2. **First time is clean** — a person with no past check-in shows sliders with NO marker (no fake "0.0"). 
3. **Draft survives** — set three sliders, reload mid-meeting: the three values are still set.
4. **Bad input rejected** — API attempt with 0 / 11 / 7.3 → validation error, nothing in the DB. ❌ Not OK if an out-of-range score reaches the table.
