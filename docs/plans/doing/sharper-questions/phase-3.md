# Phase 3 — Make sure wellbeing gets asked

## ✅ GREEN-LIT 2026-08-02

Carl green-lit this phase on the evidence in chat: the measured window table over all 76
saved runs, and the diff-level proof that the honesty rule was not touched. No paid run
was spent on it.

## Built (2026-08-02)

**The window was narrower than the plan said, and for 21 runs it did not exist at all.**

Coverage can only fire on a turn where enough turns have happened AND wind-down has not
started. Wind-down applies at `remaining_budget <= 2` and forbids a wellbeing probe by
name, so with `remaining_budget = N - T` the window is `[opensAfter, N-3]`. The old
wording opened it after 3 completed turns. Measured over all 76 saved runs
(`node scripts/coverage-window-check.js`, offline, $0):

| Session | Runs | Before | After |
|---|---|---|---|
| 5 turns | 7 | **never** | turn 2 |
| 6 turns | 13 | turn 3 | turn 2, 3 |
| 7 turns | 10 | turn 3, 4 | turn 2, 3, 4 |
| 8 turns | 8 | turn 3, 4, 5 | turn 2, 3, 4, 5 |
| 9 turns | 24 | turn 3, 4, 5, 6 | turn 2, 3, 4, 5, 6 |
| 4 turns or fewer | 14 | never | never |

**62 of 76 runs now have a wider window.** The honest part: the 14 runs of four turns or
fewer are abandoned or trivial sessions and nothing here reaches them, so "21 runs where
it could never fire" is really **7 real 5-turn sessions plus 14 stubs**.

**What landed**

- `content/prompts/plan-turn.md` planning rule 6, rewritten three ways:
  - The window **opens after 2 completed turns**, not 3.
  - The turn at `remaining_budget = 3` is named as **the last chance**, so the closing
    edge is explicit rather than an interaction the model has to derive.
  - It **yields to THE TRIGGER** in as many words: a stalled commitment beats a coverage
    tick. Phase 2 made agency rank 8 and arc planning rank 10, so `<decision_order>`
    already decided this; rule 6 now says so where it is read.
- `scripts/coverage-window-check.js` — the measurement above, so the claim is a number
  anyone can re-run rather than an argument about how two rules interact.

**The honesty rule was not touched, and that is checkable rather than promised.** The
`not_read` behaviour lives in `content/prompts/final-evaluation.md` (line 342, *"too
little real signal to read anything... when in doubt, this is the answer"*),
`backend/engine/briefing.ts` and `backend/engine/reviewer.ts`. This phase's whole diff is
`plan-turn.md`, which contains **zero** occurrences of `read_status` or `not_read`. A
conversation that never touches wellbeing still reports it as not read, because nothing
in the path that decides that changed.

**Offline proof:** `npm test` 232/232 · `typecheck` + `typecheck:admin` +
`typecheck:customer` clean · `npm run replay` 7/7 still good · `lint:copy` clean ·
`lint:prompt-size` **PASS with 33 characters to spare, cap not raised**. Paid for by
trimming two restatements: the worked example's classification tail, which the
deficiency-as-request rule already states, and the output contract's field list, which
restates the JSON shape printed directly above it.

**Cost: $0.** No OpenAI call was made.

**The cap is now effectively full.** 33 characters. Nothing else can be added to the
planner rule sheet without trimming first, and Phase 4 edits `final-evaluation.md`, which
is not under this cap. Raising it is a deliberate commit and your call.

---

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit 2026-08-02
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

- [x] Replaying the saved transcripts shows the axis-coverage rule reachable in more
      than one turn of a 6-turn session, proven offline — turns 2 and 3, was turn 3 only
- [ ] Phase 1's counters show wellbeing being read more often than the 23-of-56 baseline
      across new runs — **needs live runs, cannot be proven offline**
- [x] A conversation that genuinely never touches wellbeing **still** shows "not read".
      This is the one that matters most. Proven by the diff: the rule lives in
      `final-evaluation.md` / `briefing.ts` / `reviewer.ts`, none of them touched, and
      `plan-turn.md` has zero mentions of `read_status`
- [x] `npm run lint:prompt-size` passes without raising the cap
- [x] `npm test`, `npm run typecheck`, `npm run replay` green
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
