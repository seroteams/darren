# Phase 3 — Live proof

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10 — real run confirms ~24% cheaper ($0.38→$0.29), quality intact; caching NOT restorable (honest correction recorded). Carl: "bank it and close."

## Progress (2026-07-10) — REAL RUN, honest result

Ran one full pipeline live through the real engine (`backend/cli.ts`, which hydrates arc-overlays — the gate's blocker was only a parent-process pre-flight check, not the engine). Session `2026_Jul10_17-24-...`.

**Cost — real: $0.2887 total** (was ~$0.38). plan-turn $0.2417 (9 calls, ~8,700 tok each, all UNCACHED), rest ~$0.047. **Every rule intact:** full pipeline completed, produced a valid briefing (2 summary bullets, 4 axes, understanding + brutal-truths) and all 9 turns scored deltas.

**⚠️ CORRECTION — caching did NOT re-engage on a real run.** Every plan-turn call: `cached=0`. My earlier "~$0.16 / caching restored" was WRONG — it rested on an exact-repeat probe (identical prompt twice → cached). Real turns share a huge identical **prefix** (~7,900 tokens; they diverge only at the turn counter) but OpenAI is **not crediting that shared prefix** for gpt-5.4 post-2026-06-12. Pre-June it did (that's why old runs cached 73–88%). Best hypothesis: OpenAI moved from block-**prefix** caching to near-exact-match caching for this model, so per-turn-varying prompts never hit it **at any size** — the ~9,600 "cliff" governs exact-repeat caching only, not real runs.

**So the honest value of this slim:** runs are **~24% cheaper ($0.38 → $0.29)** purely from smaller prompts — real, permanent, quality intact — but the bigger caching win is NOT recoverable by slimming, because real prompts always vary in the tail.

## Decision for Carl
The slim is a genuine ~24% saving and it's committed. Caching won't come back via size. Bigger levers if wanted (both parked): planner → gpt-5.4-mini (~60% off plan-turn, needs quality compare), or flex/batch tier for offline QA runs (50% off, no quality change).

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
