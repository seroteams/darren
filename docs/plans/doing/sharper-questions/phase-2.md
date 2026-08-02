# Phase 2 — Make the sharp question get asked

**Part of:** [plan.md](plan.md) · **Status:** ⬜
**You asked for:** "can you go deeper now ot SHOULD change." → "a" (Move A: fix the questions)

## Goal

When a report names something that has stalled, the very next question asks them what
they are going to do about it. Today Sero notices the same thing and says it in the
briefing, after the meeting is over.

## The problem in one example

From the newest run (`logs/august/2026_Aug02_01-40-...`):

- The report answers: *"Mentioned mentoring before, still wants it, but stopped pushing."*
- Sero's next question: *"What do you expect to own next quarter that you do not own today?"*
- Sero's briefing afterwards: *"that was the moment to press for one named area before ending the conversation."*

The engine knows what it should have asked. It asks it too late, to the wrong person.

## Changes

- **Resolve the five contradictions in `content/prompts/plan-turn.md`.** The sharpest:
  thread-follow (`:34`) and the agency trigger (`:278`) each say the first `new_queue`
  item MUST be theirs, with no tiebreak, and a snag-naming answer fires both. Each
  conflict gets one explicit tiebreak sentence. Rule 9 (`:214`), which asks the model
  to detect distress that `NO_INFERRED_STATES` (`:17`) forbids it to infer, gets
  rewritten as something observable or deleted.
- **Give the agency rule a gate.** Add a golden-check in
  `backend/engine/golden-checks.ts` asserting that a snag-naming turn is followed by an
  agency turn.
- **Register the coupling.** Add a row to `content/prompts/rule-registry.ts` so the
  prompt text and the gate are verified against each other by
  `scripts/test-rule-registry.js` inside `npm test`. This is the part that stops the
  rule silently dying again, which is exactly what happened after 29 July.

## Not in this phase

- The wellbeing window (Phase 3) and the briefing shape (Phase 4).
- Any change to the question bank, its bloat, or the stored pool.
- `content/prompts/preparation.md` and `guided-wrapup.md` are claimed by another chat.
  Do not touch them.

## Done when

- [ ] The five conflicts are gone from `plan-turn.md`, each with a tiebreak that says
      which rule wins and why
- [ ] `npm run lint:prompt-size` still passes. If the tiebreaks push `plan-turn.md`
      over its 34,400 char cap, **trim, do not raise the cap** (raising a cap is a
      deliberate commit, never a side effect)
- [ ] The golden-check fails when fed a saved transcript where a snag went unanswered,
      and passes on one where it was followed up. Both proven offline
- [ ] `scripts/test-rule-registry.js` goes red if the prompt anchor is edited without
      the gate, proven by temporarily breaking it
- [ ] Phase 1's counter shows the agency rule firing in a real run, not just in a test
- [ ] `npm test`, `npm run typecheck`, `npm run replay` green
- [ ] Product owner has tested the scenarios below and said go

## Cost

Free to build and prove offline. **One paid run to prove it in the real product**:
`node scripts/gate.js --only <case>`, roughly **$0.35**. I will state the exact case and
ask before spending it. A second paid run needs a separate yes.

## Test scenarios — for the product owner

Walk these yourself. Phase 3 waits for your green light.

1. **The stalled thing gets picked up, in the room.**
   `live > incognito window > sero.team > start a 1:1`. When Sero asks a question,
   answer with something that has clearly stalled, in your own words. Something like
   *"I said I'd get them onto the mentoring scheme months ago and I've let it slide."*
   The **next question** should ask what you are going to do about that.
   ✅ **Pass:** the next question is about the mentoring thing and asks for an action or
   a commitment. ❌ **Fail:** it moves to a new topic, or it just asks you to say more
   about how you feel about it.

2. **The briefing stops taking the credit.** Finish that same 1:1 and read the briefing.
   It should no longer be telling you that you missed a moment to press, because you
   did not miss it. ❌ Not OK if the briefing still points out the exact opening that
   the conversation just took.

3. **A normal answer still gets a normal question.** Run a second 1:1 and answer
   straightforwardly, with nothing stalled or stuck. The questions should carry on as
   before. ❌ Not OK if Sero now demands a commitment after every answer. This rule
   should fire on a snag, not on everything.

4. **It cannot quietly stop working again.** I will show you the test going red when I
   deliberately break the link between the rule and its gate. You should see it name
   what broke. ❌ Not OK if the suite stays green.
