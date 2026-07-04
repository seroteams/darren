# Phase 2 — Question variety (B1)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The question bank should stop asking the same thing eight different ways. A run about one topic (sore legs) shouldn't turn every question into a leg question.

## Why
In the Brian run, 8 of 10 generated questions were about his legs (circle time, after school, transitions, class teacher…). Different words, same question — so the repeat-catcher (which compares words) never noticed. The tester flagged it twice: "Repeated a LOT."

## Changes
- `content/prompts/generate-questions.md` (near the "Don't duplicate angles" rule, ~line 167): add a diversity rule —
  - No more than half the bank may probe the primary focus.
  - Same-answer test across the **whole** set (not just neighbours): if two questions would draw the same answer from this person — even in a different setting — cut one.
  - At least two questions open a different arc intent, and the set touches at least one axis besides the primary focus.

## Not in this phase
- Changing the word-overlap dedup gate in code (parked as C2).
- The live planner's follow-up drills (that's Phase 3's neighbour, B4, parked).

## Done when
- [ ] A run's question bank visibly spreads across topics, not one theme reworded.
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light. (These need a live walked run — ~$0.35 OpenAI; say go before I run one, or walk it yourself.)
1. **Single strong signal** — walk a run where the manager note names one issue (like sore legs). Look at the questions asked. You should see a mix — some about the legs, but also school, friends, what's going well — not the same question eight ways. ❌ Not OK if most questions are the same theme.
2. **Still relevant** — the questions should still be about the person and their note, just not repetitive. ❌ Not OK if variety came at the cost of going off-topic.
3. **Boring case unaffected** — walk a normal run with a broad note; it should look as good as before (variety was already fine there).
