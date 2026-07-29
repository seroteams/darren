# Phase 4 — Plain words, sharper ask

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Findings:** F1, F5, F6

## Goal

The questions asked **in** the meeting carry the kind of push Machar only saw **after** it, in plain
words rather than heavy ones.

## The problem

This is the headline finding. Machar read the recap and said:

> "That should be one of the questions in the one-to-one... 'Daryl, what's one step you've taken so
> far to resolve the conflict?' Having that on the summary page seems like a miss, because that could
> have been one of the questions rather than the questions being a bit bland. So the system is
> clearly smart."

And separately, about the live wording:

> "Using big words like conflict and things like hard to manage... I wouldn't word it like that.
> Probably make it even more bland than that, because every different manager is going to think about
> it differently."

Those two are not in conflict. **The ask is too soft and the words are too heavy.** Both need to move,
in opposite directions, or the phase fails him.

The code says exactly why:

- The recap is *told* to write the question the manager should have asked.
  [final-evaluation.md:212-217](../../../../content/prompts/final-evaluation.md) says "forward-coaching, not
  autopsy", and the worked example at line 229 is literally a *"that was the moment to say '<question>'"*
  construction. The house phrase Machar read aloud, **"the moment to press"**, is that field's idiom.
  Nothing carries that instinct back into the live queue.
- The live planner's `<question_craft>` pushes the other way. Its "weak → sharp" table
  ([plan-turn.md:220-230](../../../../content/prompts/plan-turn.md)) rewards force, and the distilled line
  tells the model to ask for the negative and name things plainly. There is **no plain-word
  counterweight** in that file at all.
- The counterweight exists, in the wrong file. [generate-questions.md:254-267](../../../../content/prompts/generate-questions.md)
  has an AVOID/PREFER plain-speech table plus a jargon ban. It governs the **pre-session bank only**.

**F6, the second summary, rides along.** Machar: *"The first summary is really strong. The second
summary is a little bit muddled, because it's talking about this is the work, this is the conflict
we've discussed. It probably wouldn't be in the same line."* Two unrelated threads landed in one
block.

## Changes

- [content/prompts/plan-turn.md](../../../../content/prompts/plan-turn.md), `<question_craft>`:
  - **Plain words.** Port the plain-speech lint from `generate-questions.md` so the live planner is
    held to the same vocabulary as the bank. Loaded nouns (`conflict`, `tension`, `hard to manage`)
    give way to what actually happened, in the person's own words.
  - **Sharper ask.** Add the move Machar named: put the next step back on the person. "What's one step
    you've taken so far" rather than a description request. This is the recap's instinct, moved
    forward into the meeting.
  - The two are one edit because they are one register: **plain about the subject, direct about the
    ask.**
- [content/prompts/final-evaluation.md](../../../../content/prompts/final-evaluation.md) — the summary keeps
  separate threads separate (F6).
- The wellbeing rule from Phase 3 lands here too if Phase 3 has not shipped, so one paid run covers
  both prompt changes.

## Not in this phase

- Moving `brutal_truth_manager` out of the recap. Machar **liked** the recap. The point is to raise
  the live questions, not lower the summary.
- Any new engine machinery, new stage or new model call.
- Touching the tone register per meeting type. It overrides `<question_craft>` by design
  ([plan-turn.md:191](../../../../content/prompts/plan-turn.md)) and that ordering stays.

## Cost — this is the one paid run

A prompt change cannot be proven free: `replay-scenario --fixtures-only` returns **recorded** model
output, so it would replay the old wording. Smallest honest proof:

```bash
node scripts/gate.js --only <case>
```

**About $0.35.** One run, covering both prompt files. A second run needs Carl's explicit yes.
Everything else in this phase is checked free.

## Done when

- [ ] A real generated question shows the push-it-back move. Quoted in chat from actual output, not
      described.
- [ ] The heavy vocabulary is gone from generated questions on the same case.
- [ ] The recap's summary keeps two unrelated threads in separate blocks.
- [ ] The gate case passes with no new leakage, and the trust checks stay green.
- [ ] `npm test` and `npm run typecheck` green; both linters green.
- [ ] Carl has read the before-and-after output and said go.

## Test scenarios — for Carl

This one is **evidence-first**: engine changes get approved from proof in chat, per your own rule.
I will paste the same case's questions before and after, side by side, plus the gate result and its
cost.

1. **Read the questions** — do they use plain words for what happened, instead of naming it "conflict"
   or "hard to manage"? ❌ Not OK if the heavy nouns survive.
2. **Read the ask** — does at least one question put the next step back on the person, the way the
   recap line did? ❌ Not OK if they are all description requests.
3. **Read the summary** — are the work thread and the people thread in separate blocks?
   ❌ Not OK if they are still run together.

If you would rather walk it in the app instead of reading the output, say so and I will run a live
1:1 and screenshot it.
