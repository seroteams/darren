# Phase 2 — Code guards in the post-processor

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Two safety checks that run in code, so the AI literally can't ship a briefing past them — even if it ignores the written rules (which it did on the Maya run).

## Why
The briefing prompt already bans "review churn" and already has a concentration guard, but the model broke both. Rules written as prose leak. Code doesn't.

## Changes
- `src/reviewer.js` → extend the existing `applyManagerBriefingPostProcess()`:
  - **Guard A — jargon/coercive linter:** a banned-term list (e.g. "churn", "review churn", "forcing her", "make her", "pin her to"). If any briefing field contains one, flag and regenerate (or fail the check). Mirror the list already written in `prompts/final-evaluation.md` so the two stay in sync.
  - **Guard B — concentration → confidence cap:** count the distinct *themes* behind each axis's history (cheap heuristic — collapse near-duplicate excerpts). If a negative score rests on a single theme, force `confidence ≤ "medium"` and strip "defining" / ±8–10 "ignore at your cost" framing from that axis's meaning.

## Not in this phase
- The per-turn damping (Phase 1 — different stage).
- Turning distinct-evidence into a full first-class signal (Parked P5) — here it's just a backstop cap.

## Done when
- [ ] A briefing containing a banned term is caught by the linter (not shipped).
- [ ] On the Maya run, clarity's confidence is forced to ≤ medium and loses "defining pattern" framing.
- [ ] Guards don't fire on a healthy multi-theme briefing (no false positives).
- [ ] `npm test` passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Banned word blocked** — run a case (or a crafted briefing) that says "review churn". The linter should catch it. ❌ Not OK if it reaches the final output.
2. **Confidence capped on one-theme run** — replay the Maya run. Clarity should read "fairly sure / medium", not "high / defining pattern". ❌ Not OK if it still says high confidence.
3. **Healthy run untouched** — a run with two or three genuinely different findings on an axis should keep its normal confidence and wording. ❌ Not OK if the cap wrongly fires on a well-evidenced read.
