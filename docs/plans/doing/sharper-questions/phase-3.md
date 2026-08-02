# Phase 3 — Make sure wellbeing gets asked

**Part of:** [plan.md](plan.md) · **Status:** ⬜
**You asked for:** "can you go deeper now ot SHOULD change." → "a" (Move A: fix the questions)

## Goal

The wellbeing dial reads more often than it comes back blank. Today it is blank in 33
of 56 briefings, which is 59%.

## The problem is structural, not the model being lazy

The blankness itself is **correct behaviour and must stay**. The rule refuses to invent
a wellbeing read when nothing in the conversation supports one, and that honesty is the
thing that makes the dial worth anything.

The fault is upstream: nothing makes sure a wellbeing question gets **asked**.

Axis-coverage rule 6 (`content/prompts/plan-turn.md:203`) is "hard at turn 4+". But in
a 6-turn session, turn 4 leaves `remaining_budget = 2`, which trips wind-down
(`:122`) at decision-order priority 3, and wind-down forbids adding new items. So the
rule's window is exactly one turn wide, and anything else in the queue closes it.

## Changes

- Widen the axis-coverage window in `plan-turn.md` so a missing axis can be picked up
  before wind-down closes the session, rather than in the single turn where the two
  rules overlap.
- Make sure the widened rule loses cleanly to the Phase 2 agency rule when both want
  the same slot. A stalled commitment beats a coverage tick.
- Leave the honesty rule completely alone. If wellbeing was not discussed, the dial
  still says so.

## Not in this phase

- The briefing shape (Phase 4).
- Any change to how axes are scored or how the dials render.
- Adding a wellbeing question to the bank, or changing question generation.
- The focus-arc gate stays as it is: bi-weekly and "feels off" meetings still exclude
  competencies. Nothing here touches that.

## Done when

- [ ] Replaying the saved transcripts shows the axis-coverage rule reachable in more
      than one turn of a 6-turn session, proven offline
- [ ] Phase 1's counters show wellbeing being read more often than the 23-of-56 baseline
      across new runs
- [ ] A conversation that genuinely never touches wellbeing **still** shows "not read".
      This is the one that matters most. Proven with a saved transcript
- [ ] `npm run lint:prompt-size` passes without raising the cap
- [ ] `npm test`, `npm run typecheck`, `npm run replay` green
- [ ] Product owner has tested the scenarios below and said go

## Cost

Free to build and prove offline against saved transcripts. If a live run is needed to
confirm, it is one run at roughly **$0.20**, and I will ask first.

## Test scenarios — for the product owner

Walk these yourself. Phase 4 waits for your green light.

1. **Wellbeing gets asked about.**
   `live > incognito window > sero.team > start a 1:1` and answer normally, without
   raising anything about how the person is coping. Somewhere in the six questions,
   Sero should ask something that opens the door to it.
   ✅ **Pass:** the wellbeing dial in the briefing shows a read.
   ❌ **Fail:** the dial says "not read" again.

2. **It still refuses to make things up.** Run a second 1:1 and keep every answer
   strictly about deadlines and deliverables. Say nothing at all about how the person
   is doing.
   ✅ **Pass:** the wellbeing dial says "not read". That is the right answer.
   ❌ **Fail:** it produces a wellbeing score anyway. That would be worse than the bug
   we started with, and it is an immediate stop.

3. **Phase 2 still wins when it should.** Run a 1:1 and give an answer that names
   something stalled. The next question should still chase that, not switch to a
   wellbeing tick-box. ❌ Not OK if coverage now outranks the stalled thing.
