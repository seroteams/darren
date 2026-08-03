# Phase 5 — The late snag gets its question too

## ✅ GREEN-LIT 2026-08-02

Carl green-lit this phase on the evidence in chat and chose to go back to the Phase 4
counts next. No paid run was spent on it.

## Built (2026-08-02)

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit 2026-08-02
**You asked for:** "a" (fix the late-snag gap first, it's the actual complaint)

## The gap, in the case built to prove the fix

The two paid runs on Phase 4 found it. `biweekly-priya` turn 4 of 6:

- Priya says: *"Mentioned mentoring before, still wants it, but stopped pushing."*
- Sero's next question: *"What are you actually focused on this week?"*
- Sero's briefing afterwards: *"Reopen the mentoring thread and agree one concrete
  mentoring responsibility."*

The engine was **following the rules**. Turn 4 of 6 leaves `remaining_budget = 2`, which is
wind-down, and Phase 2's own precedence says agency yields to wind-down and the closer. The
planner even logged `[BUDGET-STARVED]`. So a snag named in the last third of a meeting could
never get its "what will you do about it" question, and went to the briefing instead. That
is Machar's original complaint (`docs/validation/machar-2026-07-29.md`, F1) arriving after
the meeting, in the case built to demonstrate that it no longer would.

## The fix: aim the closer, do not steal a turn

The obvious move, giving agency priority over wind-down, is wrong: wind-down exists to land
the plane, and the closer is the commitment moment. Taking its slot trades one problem for
another.

The closer was already going to ask a question of exactly this shape. So a late snag now
**becomes what the closer asks about** rather than being dropped:

- `<wind_down_rule>` → **Late snag (hard)**: a snag named at `remaining_budget <= 2` that
  never got its agency ask MUST be what the closer asks about, their first move on it and
  what they need. Reword the closer to carry it, keep `ref_alias`, note `[AGENCY-CLOSER]`.
  **This adds no item**, so wind-down is intact and the arc still lands.
- `<closer_craft>` gained the shape: *"On [the snag], what's your first move and what do
  you need?"*
- Planning rule 14 now says it in the place the model reads it: a snag named inside
  wind-down is not dropped, it becomes what the closer asks.

## The gate stops being blind to the same window

`runAgencyFollowGate` has been wrong about this window twice, in opposite directions, and
both are recorded so the third version does not repeat either:

1. **It flagged late snags as ordinary misses** — reporting rule-following behaviour as a
   fault. That is what fired on `biweekly-priya`.
2. **Then it exempted them outright** — which silenced a real gap. The snag genuinely never
   got asked about.

Now it does neither: in-window snags are judged against the **next question**, late snags
against the **closer**. One late failure per session, because there is only one closer to
carry them.

**Measured over all 78 saved transcripts** (offline, $0):

| | |
|---|---|
| Runs flagged | **28 of 78** |
| In-window misses | 30 turns |
| **Late-snag misses, previously invisible** | **14 turns** |

Those 14 are the gap you chose to fix, counted.

**One more drift caught by writing the test:** the gate's `AGENCY_ASK` pattern did not
recognise "what's your first move", which is the exact closer shape the new prompt rule
tells the model to produce. Prompt and gate would have disagreed from day one. Added.

**Offline proof:** `npm test` 232/232 (13 in this gate's group, up from 10) · `typecheck` +
`typecheck:admin` + `typecheck:customer` clean · `npm run replay` 7/7 still good ·
`lint:copy` clean · `lint:prompt-size` **PASS with 53 characters to spare, cap not raised**.

**Cost: $0.** No OpenAI call was made in this phase.

## What paid for it

Four more restatements, since the cap had 33 characters left:

- The `<thread_follow_rule>` example *"the billing rewrite is going sideways"* → *"Where
  specifically is it going sideways?"*. **Phase 2 made that example wrong**: a snag-naming
  answer belongs to THE TRIGGER now, so the prompt was teaching the model to do the exact
  thing Phase 2 forbids. Replaced with one line saying so.
- The `<worked_examples>` "Flat/absent" case, which repeated `<assessment_rules>` Step 1
  almost word for word, including the same "nothing stretching" phrase.
- Three clauses of the "Distilled:" line that restated rows of the table directly above it.
- One of the two crisis-support examples.

No rule was removed.

## Done when

- [x] A snag named inside wind-down is carried into the closer rather than dropped
- [x] The gate checks the closer for it, and goes red when the closer ignores it
- [x] The gate no longer reports rule-following behaviour as a miss
- [x] `npm run lint:prompt-size` passes without raising the cap
- [x] `npm test`, `npm run typecheck`, `npm run replay` green
- [ ] A real run shows the closer picking up a late snag — **needs a paid run or your walk**
- [ ] Product owner has tested the scenario below and said go

## Cost

Free to build and prove offline. Confirming it on a real run is one run at roughly **$0.21**,
and I will ask first.

## Test scenario — for the product owner

1. **The late problem still gets its question.**
   `live > incognito window > sero.team > start a 1:1`. Answer normally until you are near
   the end, then on the **second-to-last or last question** answer with something that has
   clearly stalled: *"I said I'd get them onto the mentoring scheme months ago and I've let
   it slide."*
   ✅ **Pass:** the final question asks what your first move on that is, and what you need.
   ❌ **Fail:** the final question is generic, and the mentoring thing turns up in the
   briefing afterwards as something to reopen.

2. **The meeting still lands.** That same 1:1 should still finish cleanly on a closing
   question and produce its recap. ❌ Not OK if the conversation now runs past its questions
   or ends without a proper close. The fix was supposed to aim the last question, not add one.

3. **An early problem still gets chased immediately.** Run a second 1:1 and name something
   stalled in the first two or three answers. ❌ Not OK if it now waits until the end.
