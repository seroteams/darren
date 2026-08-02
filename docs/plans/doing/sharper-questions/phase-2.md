# Phase 2 — Make the sharp question get asked

## Built (2026-08-02)

**The five contradictions, and the tiebreak each one got.** Only two were named in the
SHOULD review; the other three were found by reading every "MUST" claim in the file
against `<decision_order>`.

| # | The clash | Tiebreak now written |
|---|---|---|
| 1 | Thread-follow (`:34`) and THE TRIGGER (`:278`) each claim the FIRST `new_queue` item, and a snag-naming answer fires both | **Agency wins.** The snag is already on the table, so drilling it again is the second description question THE TRIGGER exists to stop |
| 2 | The agency rule's own rank is stated twice and disagrees: planning rule 14 says it "outranks arc progression", but THE TRIGGER lives inside `<question_craft>`, which `<decision_order>` ranked **last** | Agency is now **rank 8** in `<decision_order>`, above thread-follow and arc planning; rule 14 quotes that rank instead of its own |
| 3 | Planning rule 9 asked the model to spot a "distressed/anxious" answer, which `NO_INFERRED_STATES` (`:17`) forbids **and explicitly overrides** | Rewritten observable: strain stated in THEM in their own words. Tone, brevity and a hard-sounding situation are explicitly not it |
| 4 | Coverage (rule 6, "hard at turn 4+") and wind-down are both "hard" and both fire at `remaining_budget <= 2` | Wind-down wins: coverage is never served at the cost of the closer |
| 5 | Rule 4 permits adding an item **only** for thread-follow, while four other hard rules mandate an added item (agency, the shallow re-prompt, crisis, a generated closer) | Rule 4 now lists all five |

Plus one line that makes the whole set work: **`<decision_order>` is now declared the
only tiebreak**, and the loser of any first-slot clash goes to position 2 or to `note`.

**What landed**

- `content/prompts/plan-turn.md` — the five tiebreaks above. **Net zero on the size
  cap:** the additions were paid for by collapsing five restatements (wind-down stated
  in three places, the closer-craft pointer in three, `<living_plan>`'s own precedence
  list, and one weak-to-sharp table row that the agency table below it already made).
  No rule was removed.
- `backend/engine/golden-checks.ts` — `runAgencyFollowGate`, plus `SNAG_NAMED` and
  `AGENCY_ASK`. Reads the session in pairs: turn N's answer, then turn N+1's question.
- `evals/trust-checks.ts` — wired as the `AGENCY_NOT_ASKED` **warning**. Warning and
  not a hard fail for the same reason as its sibling `WELLBEING_SITUATION_LEAK`: the
  rule fired on 2 turns in the entire 76-run back catalogue, so hard-failing would make
  the replay suite permanently red and bury the signal. Promote it once new runs stop
  tripping it.
- `content/prompts/rule-registry.ts` — the row that couples THE TRIGGER to the gate.

**It grades the question, not the planner's claim.** The first design skipped any turn
whose note carried `[AGENCY]`. One of the two historical firings killed that: run
`2026_Jul29_23-54` tagged `[AGENCY]` and then asked *"What has made design reviews feel
messy?"*, which is another description question. A self-certified marker is a claim and
the question text is the evidence, so the gate now grades the wording and **names the
mismatch** when a note claims a firing that the question does not show.

**Proof on real saved runs** (offline, $0, all 76 transcripts):

| | |
|---|---|
| Runs flagged | **24 of 76**, 39 turns in total |
| Runs clean | 52 |
| Fails on a real unanswered snag | ✅ `2026_Aug02_01-40` turn 4, the exact example above |
| Passes on a real followed-up snag | ✅ `2026_Jul29_13-24` turn 3, answered by *"What have you tried with sales and BD so far, and what happened?"* |

**Not inert.** Driven through the real `runTrustChecks` entry point on a saved run, the
warning comes out the other side: `AGENCY_NOT_ASKED: turn 4 named a snag...`. That check
exists because this exact gate family has shipped correct and silent before, when the
trust-checks field whitelist dropped what the gate read.

**The registry goes red on purpose.** Reworded THE TRIGGER's anchor without touching the
gate: `scripts/test-rule-registry.js` failed naming the row and the missing anchor text.
Restored, green again.

**Offline proof:** `npm test` 232/232 · `typecheck` + `typecheck:admin` +
`typecheck:customer` clean · `npm run replay` 7/7 still good · `lint:copy` clean ·
`lint:prompt-size` **PASS with 66 characters to spare**. The new test group was confirmed
red before the implementation.

**Cost: $0.** No OpenAI call was made.

**One thing to watch:** the size cap now has 66 characters of headroom, down from 337.
The next prompt rule cannot be added without trimming first. Raising the cap is a
deliberate commit and your call, not a side effect.

---

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting your test
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

- [x] The five conflicts are gone from `plan-turn.md`, each with a tiebreak that says
      which rule wins and why
- [x] `npm run lint:prompt-size` still passes. If the tiebreaks push `plan-turn.md`
      over its 34,400 char cap, **trim, do not raise the cap** (raising a cap is a
      deliberate commit, never a side effect)
- [x] The golden-check fails when fed a saved transcript where a snag went unanswered,
      and passes on one where it was followed up. Both proven offline
- [x] `scripts/test-rule-registry.js` goes red if the prompt anchor is edited without
      the gate, proven by temporarily breaking it
- [ ] Phase 1's counter shows the agency rule firing in a real run, not just in a test
      — **needs your live 1:1, it cannot be proven offline**
- [x] `npm test`, `npm run typecheck`, `npm run replay` green
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
