# Phase 1 — Honest arc stages

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A scripted persona run shows the real shape of the conversation, so the review stops saying "arc covered 0/5" when the conversation actually moved through evidence, cause, and a commitment.

## The problem
Right now every scripted question gets stamped with the same stage (`self_read`), no matter the meeting type. So the coverage counter sees one stage all session and reports almost nothing covered — even when the conversation clearly progressed. Ten of the twelve June 7 runs failed the arc check for this reason. The questions were fine; the label was wrong.

## Changes
- **`config/persona-bench-v1.json`** — give each scripted question its true stage, drawn from that meeting type's real arc (Performance, Bi-weekly, Growth, Something-feels-off, Onboarding each have their own).
- **`frontend/server/persona-script.js`** — use the stage written in the script instead of hardcoding `self_read`.
- **`prompts/generate-questions.md`** — stop hardcoding `self_read` for the prep opener; use the first stage of whatever meeting type is running (this also helps live, non-scripted runs).
- **`src/reviewer.js`** — quick check that openers are still treated as openers and nothing else regresses.

## Not in this phase
- Rewording any questions (Phase 2).
- Briefing wording (Phase 3).

## Done when
- [ ] A scripted run's transcript shows different, correct stages — not all `self_read`.
- [ ] The review verdict reports honest arc coverage for that run.
- [ ] `npm run gate` and `npm run smoke` are green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Performance run** — run the Aisha (or Maya) scripted persona. Open the transcript. You should see the stages move through the performance arc (opening → a recent example → the cause → a commitment), not seven copies of `self_read`. ❌ Not OK if every question still shows the same stage.
2. **A different meeting type** — run a Growth persona (Jordan or Ben) and a Bi-weekly one (Sofia or Samira). The stages should match each type's own arc. ❌ Not OK if a Growth run shows performance stages, or everything is one stage.
3. **The coverage number** — on those same runs, the review's "arc covered X/Y" chip should now reflect what actually happened, not 0. ❌ Not OK if it still reads 0 on a full conversation.
4. **Nothing else moved** — the questions asked and the answers are the same as before; only the stage labels changed.
