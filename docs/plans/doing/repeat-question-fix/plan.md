# Repeat-question fix — treat an answered cause as resolved

**Goal:** Once a manager has named the cause of a snag, the engine stops re-asking it in new wording — later questions move to new ground, or to a genuinely new layer (what would help), never the same what/why again.
**Driver:** Carl
**Created:** 2026-07-18
**Mockup:** none — no visual surface

## The why (one paragraph)
Tester feedback (Peitho test drive, 2026-07): asked "where did things grind to a halt", the tester answered *"other pressing deadlines"* — and three questions later got *"what deadlines keep crowding out the Thailand work"*. Same snag, new clothes. The code repeat-catcher only compares a candidate question's **wording** against other questions (70% shared-word overlap), so differently-worded twins sail through; the only check against **what the answers already covered** is one soft line in the planner prompt that the model may ignore. Worse, the grounding rules actively *license* the repeat — both questions trace to the manager's answer, so both look well-grounded.

## Done means
- The tester's exact pattern cannot recur: after a cause is named, no later question re-asks the what/why of that same cause, however reworded.
- New-layer follow-ups survive ("what would take the pressure off" is not a repeat).
- Offline tests + typecheck green; ONE smallest paid replay (~$0.35) proves it against the real model.

## Resolved before we start (dug out of the code, 2026-07-18)
- **Two dedup layers exist, both lexical:** Jaccard ≥ 0.7 on content words — `backend/engine/question-eligibility.ts` (`isRepeatOfAsked` / `checkQuestionEligibility`), applied to planner-written items in `reconcile-queue.ts` and at serve time (`dropIneligibleHeads`). Zero-word-overlap rewordings score ≈0 and pass.
- **The only semantic layer is soft:** `<dedup_rules>` in `content/prompts/plan-turn.md` ("DROP any whose topic the answer volunteered") — model discretion, unenforced.
- **The fix point:** plan-turn already returns structured queue ops each turn (materialised by `reconcile-queue.ts`) — the natural place to make the check mandatory and enforce it in code. Drops get logged via `planResult.issues` (surfaced, never silent — engine-honesty rule).
- **Not embeddings:** a semantic-similarity service is overkill for v1; the planner already reads the full transcript every turn — it just isn't *required* to act on it. Parked below.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Resolved-causes gate | Planner must name the causes already answered and tag queue items; code drops any item probing a resolved cause with no new layer | 🔨 built — awaiting walk |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Built 2026-07-18, offline-proven, awaiting Carl's walk.** Baseline was 157/157; after the build, `npm test` 157/157 (+5 new gate cases) and typecheck clean. Not green-lit — Carl walks the phase-1 scenarios, then phase-close. Still owed before done: ONE smallest paid replay (~$0.35) OR Carl's live dev-app walk as the real-model proof.
Board: https://claude.ai/code/artifact/d28be040-93ad-4df9-9235-46a37b3e84d3

## Parked
- Embedding-based semantic dedup — only if the planner-declared gate proves too blunt in real runs.
- Extending the gate to the pre-session bank generator (bank questions are reconciled per turn anyway).
