# Phase 4 — Plain words, sharper ask

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built and run twice, **proven** · **Findings:** F1, F5, F6

## Second run — the sharper ask landed (2026-07-29)

Carl chose to strengthen the rule and pay for one more run. **$0.1640. Two runs, $0.3288 total,
still under the single-run estimate of $0.35.**

### Why the first attempt failed, before writing a louder version

Three causes, all structural rather than "the model ignored it":

1. **It was a session-level quota.** "Across the session, at least one question must ask for their
   action" is unenforceable by a planner that only ever sees **one turn**. It has no reliable way to
   know whether the quota is already met.
2. **It sat below a table teaching the opposite.** Three of the five `PREFER` examples in the
   "Weak → sharp" table are locate questions, and the Distilled line's first instruction is
   *"locate + cause… where is X at?"*. Run 1's questions 3 and 4 followed that pattern exactly. The
   model imitated the worked examples, which is what worked examples are for.
3. **It was craft, and craft is last.** `<decision_order>` ranks question craft **10 of 10**, below
   arc planning. A craft-section rule loses every tie.

### What changed

- **A per-turn trigger, not a quota:** if the last answer named a snag and nobody has yet asked what
  they did about it, the first `new_queue` item must be the agency question. Checkable from the last
  answer alone. Tagged `[AGENCY]` in the note so it can be counted.
- **Promoted out of craft** into `<planning_rules>` as rule 14, so it sits at arc-planning priority
  and outranks arc progression. It still yields to wind-down, the closer, crisis and the shallow
  re-prompt.
- **The imitation target changed:** two rows added to the "Weak → sharp" table converting Run 1's own
  weak questions, and the Distilled line now carries the agency move.

### The result, same case, same fixture answers

| | Run 1 | Run 2 |
|---|---|---|
| T3 | Where is the internal sell **taking more time than it should** right now? | Where is the internal sell **getting stuck** right now? |
| T4 | **Where does that lack of understanding show up most** with sales and BD? | **What have you tried** with sales and BD so far, **and what happened?** |
| T6 | What's a piece of work you've been putting off because it would stretch you? | Which part of your work have you been leaning into, and which part you've been avoiding? |

**T4 is Machar's ask, generated live, in the meeting.** He said the recap's "what's one step you've
taken so far to resolve the conflict?" should have been asked in the room. It now is. Turn 3's note
carries `[AGENCY]`, so the planner consciously fired the rule rather than landing there by chance.

**Wellbeing held up too:** the situation answers routed to engagement and clarity, the only wellbeing
delta was "Got a cold" (the person's own state, correctly scored), and the new gate returned clean.

### The two hard fails, twice

Run 2 came back REGRESSED again, on `WRONG_MEETING_TYPE` and `FOCUS_SHAPE_LEAK`.

- `WRONG_MEETING_TYPE` is identical to Run 1 and has the same proven cause: **the question-bank stage
  never runs on this case**. Both runs' cost logs show focus-points, preparation, a preparation retry,
  six plan turns and evaluation. No `03-question-bank` call, no folder. An absent bank is 0/4 stages.
- The other hard fail **was different each time** — `EVIDENCE_ANCHOR` in Run 1, `FOCUS_SHAPE_LEAK` in
  Run 2 — and both are focus-points-stage failures. Two runs failing that stage two different ways is
  evidence the stage is flaky on this case, independent of anything here. Neither
  `generate-focus-points.md` nor the bank was touched by this work.

**Still not claimed: "pre-existing".** No baseline was taken before the work began. What is claimed
is narrower and evidenced: the failures are in stages this phase never edited, one has a concrete
mechanical cause, and the other is not reproducible run to run.

### Found on the way, not fixed here

**Your no-em-dash rule does not reach the engine's output.** `npm run lint:copy` scans `admin/src` and
`frontend/src` only. Generated questions are the most user-facing text in the product and both runs
produced em dashes in them, e.g. *"Which part of your work have you been leaning into — and which
part you've been avoiding?"* Parked in [plan.md](plan.md) rather than folded in here.

---

## First run (2026-07-29)

### The paid run

`node scripts/gate.js --only machar-biweekly-jun11` — a bi-weekly built from Machar's own June data,
so it exercises the relational arc where all three changes apply. **Actual cost $0.1648**, under the
$0.35 estimate. One run, as agreed. Log: `logs/gate/2026-07-29T04-25-25-271Z/result.json`.

**The case came back REGRESSED**, on two hard fails: `EVIDENCE_ANCHOR` and `WRONG_MEETING_TYPE`.

**Neither is attributable to this work, and one has a proven cause.** `WRONG_MEETING_TYPE` reported
"only 0/4 arc stages covered". That check reads the **question bank**, and the run's own cost log
shows the bank stage never ran at all: the calls were `01-focus-points`, `01b-preparation`,
`01b-preparation-retry`, six `04-plan-turn`, `05-evaluation`. No `03-question-bank`, no
`03-question-bank` folder in the run directory. An absent bank means an empty stage list means 0/4.
`EVIDENCE_ANCHOR` is about focus points and `engagement_read` matching the manager's notes; this
phase touched neither `generate-focus-points.md` nor the engagement-read rules.

**Honest limit: I cannot say "pre-existing" with certainty**, because no gate baseline was taken
before the work started (it is the paid one, and taking it would have doubled the spend). What can be
said is that both failures are in stages this phase did not change, and one has a concrete
non-attributable cause.

### What the run earned: a defect in Phase 3's gate

The gate run is the reason this was caught, and it is the best thing the $0.16 bought.
`runWellbeingSituationGate` was **inert inside the suite**. It reads each turn's `realized_deltas`,
and [`toLooseTranscript`](../../../../evals/trust-checks.ts) is a field whitelist that silently dropped
them. The gate was correct, fired on the raw transcript, and reported nothing through
`runTrustChecks`. The file already carried a comment warning about exactly this failure mode for the
per-turn `note` field. Fixed, and proven by pushing Machar's own scenario through the full
`runTrustChecks` path and watching it fire.

### Turning it on against real history

With the deltas flowing, the free offline replay suite re-graded all seven frozen runs. **Five of
seven book a negative wellbeing delta on an answer where the person never described their own
state.** That is the measured size of F4 across the back catalogue. The blatant ones:

| Run | Answer that moved wellbeing negative |
|---|---|
| leak-devon | "Wants to present more often in the architecture review." (−1) |
| marcus-lee | "wants to know if legal reviewed the new terms" (−1) |
| sofia-martinez | "let's try the single review checkpoint next milestone" (−1) |

**Known imprecision, stated rather than buried.** The evidence test is a keyword list, so it flags
some genuine personal-state answers phrased without those words. One was found and fixed (Maya's
"the comments felt like proof she wasn't good enough" is unmistakably her own state and now exempts).
At least one remains: Sofia's "lower than usual, getting through things but with less momentum" is an
energy answer and still flags. This is why the gate is a **warning, not a hard fail** — a false alarm
costs noise, not a red build, and a gate that cries wolf is one people scroll past.

### Changes

| File | What changed |
|---|---|
| [plan-turn.md](../../../../content/prompts/plan-turn.md) | New **PLAIN WORDS, SHARP ASK** block in `<question_craft>`. Names the loaded nouns to avoid (`conflict`, `tension`, `friction`, `hard to manage`…) and says why: each is a diagnosis wearing a question. Then a four-row table turning description requests into questions that put the next move back on the person. |
| [final-evaluation.md](../../../../content/prompts/final-evaluation.md) | **One thread per bullet** in `<summary_bullets_rule>` (F6). Machar: "this is the work that's okay, this is the conflict we've discussed... it probably wouldn't be in the same line." |
| [trust-checks.ts](../../../../evals/trust-checks.ts) | `realized_deltas` survives the whitelist. The wellbeing gate emits a **warning** rather than a hard fail, with the reason written down. |
| [golden-checks.ts](../../../../backend/engine/golden-checks.ts) | The gate gets its OWN evidence list rather than borrowing the briefing's distress regex, which asks a different question. Widened twice from real false positives. |
| [replay-suite.ts](../../../../scripts/lib/replay-suite.ts) | ⚠️ **I widened a guard, flagging it for you.** An adversarial fixture refused baselining on `verdict !== "PASS"`, which treats a warning the same as a safety failure, so any new advisory check permanently reddens every safety fixture it touches. It now keys on **hard fails**. The safety bar is unchanged: zero hard fails on an adversarial case. Say the word and I will revert it. |
| `evals/replay/*/expected.json` | Re-frozen, so the current count is the ceiling and a NEW occurrence goes red. Each warning is written into the fixture in full, so nothing is hidden by being expected. |

**Free checks:** `npm test` **206/206**, typecheck clean, both linters, replay **7/7**.

## ⚠️ What did NOT land

**The "sharper ask" half is not proven, and on this evidence it probably did not work.** The six
questions the run produced:

1. How's the last two weeks actually felt, energy-wise? *(scripted opener)*
2. You said "Got a cold…" what's behind that for you right now? *(thread-follow, fixed stem)*
3. Where is the internal sell taking more time than it should right now?
4. Where does that lack of understanding show up most with sales and BD?
5. What would a good quarter look like for you from here?
6. What's a piece of work you've been putting off because it would stretch you?

**Plain words: yes.** No loaded nouns anywhere, though this case's material never tempted them.
**Sharper ask: no.** Only #6 comes close to asking what *they* have done or will do. Numbers 3, 4 and
5 are description requests, which is exactly what Machar called bland.

Two caveats before concluding the rule failed: this case's notes are about internal selling and
partner alliances with no team-conflict thread, so it is a weak test of his actual scenario; and two
of the six questions are intro or thread-follow, which the rule exempts by design.

**Wellbeing did behave.** Situation answers routed to clarity and engagement, not wellbeing, and the
one wellbeing negative was "Got a cold" — the person's own state, correctly scored and correctly not
flagged.

**Committed local.** Nothing pushed.

---


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
