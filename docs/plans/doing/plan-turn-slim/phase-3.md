# Phase 3 — Live proof

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Prove on a real run that caching is back, the run costs ~$0.15, and the planner is as good as before.

## Changes
- Baseline first (free): note the last pre-slim run of the chosen scenario as the comparison run.
- **One paid pipeline run (~$0.35) — needs Carl's go-ahead at the start of this phase.** Same scenario as the baseline run.
- Compare: new run's `cost.json` (cache hits + total) and a side-by-side run review (reviewrun) of baseline vs slimmed planner output.
- If anything looks off, findings come back here — no fixes jammed into this phase without approval.

## Not in this phase
- No full 8-case gate sweep by default (~$3) — only if Carl asks for it after seeing the single-case result.
- No further prompt edits without going back through a cut-list amendment.

## Done when
- [ ] New run's cost.json shows `cached_tokens > 0` on plan-turn calls 2+ (destination checked — the logged file, not an assumption).
- [ ] Run total ≈ $0.15 (vs ~$0.38 baseline).
- [ ] Side-by-side review shows no drop: questions still grounded, arc followed, closer lands, scoring sane.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Green light here closes the plan.
1. **The receipt** — open the new run's `cost.json`. The plan-turn calls after the first should show `cached_tokens` in the thousands, and `usd_total` around $0.15. ❌ Not OK if cached is still 0 or the total is near $0.38.
2. **The conversation still feels right** — read the new run's transcript next to the baseline run's (I'll link both). Questions should still follow threads, fit the person's role, and land a proper closer. ❌ Not OK if questions got generic or the arc wandered.
3. **The briefing holds** — open the final briefing from the new run. It should be as specific and grounded as the baseline's. ❌ Not OK if it got vaguer.
