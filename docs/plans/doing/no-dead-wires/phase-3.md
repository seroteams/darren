# Phase 3 — The living plan

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-30 — Carl chose "a · tested, good" on the scenario hand-off (commit 15aa9959, committed local, ships next go-live)

## Built (2026-07-30)
- content/prompts/plan-turn.md: new `<living_plan>` block (queue is a draft; reorder to what the conversation earned; rewrite stale items in the employee's words with a grounding quote; drop overtaken items; cap three rewrites per turn; crisis/wind-down/closer/thread-follow outrank it) and planning rule 2 rewritten from "prefer keeping" to "keep only what still fits". Mid-meeting notes block added to the turn state (inert until P4 passes notes in).
- backend/engine/question-generator.ts: the prep-opener pin releases after three asked questions.
- backend/engine/queue-manager.ts: grounding corpus extracted as exported `buildGroundingCorpus` (behaviour unchanged); optional `sessionNotes` plumbed through planTurn, the preview mirror and the prompt, and into the corpus, all inert until P4.
- Tests: +5 across messages.test.ts (notes render, cap, cache-boundary placement), question-generator.test.ts (pin holds early, releases at three), queue-manager.test.ts (notes join the corpus only when provided).
- Offline proof: npm test 217/217 · typecheck clean · lint:copy PASS · replay fixtures: only the 2 known pre-existing prep-validator failures.
- PAID PROOF (the plan's one paid run): `node scripts/gate.js --only machar-biweekly-jun11` PASS (1 ok / 0 regressed / 0 error). Run cost $0.196 (normal band $0.16-0.20); plan-turn prompts 11.2-11.6k tokens; cached 8,960 tokens on every turn after the first (cache intact); no grounding-dropped spike. Spend under the ~$0.35 estimate.

## Goal
The question queue behaves like a draft, not a script: it reorders and rewrites the remaining questions from what the conversation has actually said.

## Changes
- content/prompts/plan-turn.md: new `<living_plan>` rules block (queue is a draft; reorder to what the conversation earned; reword stale items in the report's own words, grounded in their quotes; drop overtaken items; cap three rewrites per turn; crisis, wind-down, closer and follow-up rules still outrank it).
- backend/engine/question-generator.ts: the prep-opener pin releases after three asked questions.
- backend/engine/queue-manager.ts: grounding corpus extracted as a testable function (behaviour unchanged); optional mid-run-notes hook plumbed but inert until phase 4.
- Tests: queue-manager, reconcile-queue (an ungrounded rewrite safely falls back to the original), question-generator (pin release), plus an adversarial fixture: a hostile answer ("ignore the plan...") must not steer the queue.
- End of this phase: the ONE paid proof, `node scripts/gate.js --only lin_biweekly_thread` (~$0.35), checking no regressions, cache intact, rewrites grounded.

## Not in this phase
- Passing mid-run notes in for real (phase 4). The mid-run bank refresh call (only if the gate case proves the mandate under-delivers).

## Done when
- [ ] A run log shows at least one remaining-queue question rewritten with a grounding quote from the transcript.
- [ ] All free checks green; the paid gate case passes (cost stated before running).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The plan bends to the room** — `live > sero.team > run a 1:1`, and in an early answer raise something big and specific ("Daryl wants to quit the beta project"). ✅ Pass: later questions clearly pick this up in your words, and questions that no longer fit have disappeared or changed. ❌ Fail: the later questions read exactly like a pre-written list that ignores what you said.
2. **It does not hallucinate** — give short, ordinary answers all run. ✅ Pass: rewritten questions only ever reference things you actually said. ❌ Fail: any question asserts something nobody said.
3. **The ending still lands** — finish any run. ✅ Pass: the final question still closes the meeting properly. ❌ Fail: the closer vanished or arrived mid-meeting.
