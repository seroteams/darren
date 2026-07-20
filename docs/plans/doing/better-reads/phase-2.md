# Phase 2 — Arm the protect gate

## ✅ GREEN-LIT 2026-07-20
Carl approved off the evidence table (protect gate keeps "Shipped payments-fix" +2, filler stays zeroed; never-invent invariant tested). Merged to origin/main and riding the 2026-07-20 push to live. Reviewer single-touch recalibration remains deferred (promises-loop lane) — folds into a later slice with the new read-quality tags.

**Status:** ✅ closed

## Scope
1. **Protect gate** (`backend/engine/delta-gates.ts`): on a terse-but-concrete answer, `applyShallowGate` keeps model-proposed **positive** deltas (negatives still zeroed — a 2-token note isn't evidence of a problem, but a concrete "Shipped X" corroborates the model's own upward read). Protected deltas still pass `clampToSignature`, so nothing can exceed the question's signature. A kept delta is booked, so it leaves the overflow; an `issues` line ("shallow gate — protected momentum +2, answer terse-but-concrete") records that protection fired, keeping the log honest.
2. **DEFERRED to a later slice (promises-loop lane 1b4b459f):** reviewer.ts single-touch recalibration (|score|≥3 on one quality-note touch → read/low-confidence instead of not_read) and the run-health `scoring` block.

## Honesty invariant (tested)
The gate never writes a delta the model didn't propose: input without a positive delta can never gain one; magnitudes never increase.

## Tests (first)
- Extend `backend/engine/delta-gates.test.ts`: terse-but-concrete keeps +2 momentum, still zeroes −1 clarity; filler answer still zeroes everything; [SHALLOW]-marker-only (non-terse answer) still zeroes everything; invariant test (no invented/increased deltas); overflow now records only what was actually zeroed.
- Frozen replay fixtures that move are listed below, re-frozen deliberately.

## Fixture diffs (filled during build)
**None moved.** `--regression-all --fixtures-only` fully green (0 fails — the 2 pre-existing listenFor fails were fixed by another lane in the meantime). Honest read: the regression fixtures' scripted answers are all longer than the 2-token terse floor, so the protect gate never fires on them — its effect shows on real terse manager notes, proven at the unit layer instead:

| Manager's note | Model proposed | Before P2 | After P2 |
|---|---|---|---|
| "Shipped payments-fix" | momentum +2, clarity −1 | all zeroed | **momentum +2 kept**, clarity zeroed |
| "Promoted." | growth +1 | zeroed | **growth +1 kept** |
| "fine" / "not bad" / "ok good" | any | all zeroed | all zeroed (unchanged) |

Verified 2026-07-20: 15/15 gate tests (incl. never-invent invariant), suite 161/161, typecheck clean.

## QA scenarios (Carl)
1. Same skew script re-run: up-bookings should rise only where the answer was concrete; filler stays zeroed.
2. Replay diff table: each moved fixture listed with before/after — nothing moves that shouldn't.
