# Phase 1 — Count what is happening

**Part of:** [plan.md](plan.md) · **Status:** ⬜
**You asked for:** "can you go deeper now ot SHOULD change." → "a" (Move A: fix the questions)

## Goal

Make question quality a number before we try to change it, so Phase 2 and Phase 3 can
be judged on evidence rather than on how the output feels.

## Why this goes first

Right now every quality gate we own grades the briefing. The complaint was about the
questions. If we change the rules first we will have no way of telling whether it
worked, and "the questions feel better" is exactly the kind of claim that quietly
turns out to be wrong.

## Changes

- **A question-quality dimension on the judge.** `backend/engine/regression-judge.ts`
  currently has 8 dimensions, all scoring the briefing, with the transcript passed in
  and unused. Add one dimension that grades the questions themselves.
- **Two counters per run**, written into `run-health.json`:
  - `zero_signal_turns` — how many questions produced empty or all-zero `realized_deltas`
  - `agency_fired` — how many turns carried the `[AGENCY]` marker
- **A baseline over the 76 saved runs**, produced offline from the existing transcripts
  in `logs/`, so we have a before number to compare against. Written as a short table
  into this phase file when it is built.

## Not in this phase

- No prompt rule changes. Not one. `content/prompts/plan-turn.md` is untouched here.
- No attempt to make the agency rule fire more often (that is Phase 2).
- No change to the wellbeing window (Phase 3) or the briefing shape (Phase 4).

## Done when

- [ ] A fresh run's `run-health.json` carries `zero_signal_turns` and `agency_fired`,
      confirmed by reading the actual file, not by reading the code that writes it
- [ ] The judge returns a question-quality score, confirmed on a saved transcript replay
- [ ] The baseline table over the 76 saved runs is written into this file, and it
      reproduces the numbers already measured: ~100 of 489 zero-signal turns, agency
      firing in 2 runs
- [ ] `npm test`, `npm run typecheck` and `npm run replay` all green
- [ ] Product owner has tested the scenarios below and said go

## Cost

Free. Every check above runs against transcripts we already have. **No paid run is
needed for this phase** and none should be spent on it.

## Test scenarios — for the product owner

Walk these yourself. Phase 2 waits for your green light.

1. **The baseline reads true.** Open this file and read the baseline table I add at the
   bottom when the work lands. You should see roughly 1 in 5 questions marked as having
   bought nothing, and the agency rule showing 2 runs, both 29 July. ❌ Not OK if the
   numbers disagree with the plan's "Resolved before we start" section without an
   explanation of which is right.

2. **A run reports its own numbers.** `live > incognito window > sero.team > start a
   1:1 and answer 3 or 4 questions normally`. Then tell me the run and I will show you
   its `run-health.json`. You should see a count of questions that bought nothing.
   ❌ Not OK if the file has no such number, or the number is obviously wrong (says 0
   when a question clearly went nowhere).

3. **The judge now says something about the questions.** I will show you the judge
   output for one saved run, before and after. You should see a new line grading the
   questions, separate from the eight lines about the briefing. ❌ Not OK if the new
   score just restates how good the briefing was.

4. **Nothing else moved.** The 1:1 you ran in scenario 2 should feel exactly as it did
   before. Same questions, same briefing. ❌ Not OK if anything about the conversation
   changed. This phase only counts, it does not steer.
