# Phase 2 — Coaching that re-earns itself each turn

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The coaching beside the next question is written for this moment in the meeting, not copied from before it started.

## The problem in one line
`plan-turn.md` tells the planner "Carried unchanged: copy the item's hints verbatim". A question that sits in the queue for five turns arrives with coaching written before anyone spoke, so the panel never reflects a word the person said.

## Changes
- `content/prompts/plan-turn.md` — the `<output_contract>` hints block gains a rule: for the FIRST item only (the one the manager is about to ask), the `listen` lines are always written fresh against the latest answer, even when the question wording is carried unchanged. Deeper items keep copying verbatim, since they may never be asked.
- Structure before volume: the rule goes inside the existing hints block next to the "carried unchanged" line it overrides, not appended as a louder paragraph elsewhere. A rule in the wrong place is a rule that does not fire.
- `backend/engine/` — a wiring check that the fresh lines actually reach the panel, not just the model's output. Hints are rebuilt field by field in `reconcile-queue.ts`; a correct rule that gets dropped downstream is the exact failure this repo has hit before.

## Not in this phase
- Rewriting the hint craft rules to break the "Whether he names a specific ..." template (parked).
- The fallback panel (phase 1 should empty it out).
- Anything about the Live scores half of the panel.

## Cost
Free checks first: unit tests, typecheck, and a fixtures-only replay prove the wiring. Proving the model actually behaves needs ONE paid run: `node scripts/gate.js --only <case>`, roughly $0.35. State it before running; a second run needs Carl's yes.

## Done when
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] `node scripts/replay-scenario.js <id> --fixtures-only` shows the hints surviving the rebuild into the served question.
- [ ] One paid run, and its transcript shows the first item's `listen` lines quoting or naming something from the previous answer on at least 3 of the turns.
- [ ] Read from the run log, not from the prompt: two consecutive turns never carry identical hint text.
- [ ] Screenshot of the real panel mid-run, showing a line that could only have been written after the previous answer.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **The panel hears the answer** — `local > admin test runner > Questioning`. Run a meeting and type a real, specific answer (name a person and a date, e.g. "Priya pushed the payment step to the 14th"). Go to the next question. At least one "Listen for" line should point at something from what you just typed. ❌ Not OK if all three lines would have made equal sense before you typed anything.

2. **It keeps moving** — answer three more questions, each time saying something new. The right panel should change every turn. ❌ Not OK if the same three lines survive two questions in a row.

3. **It doesn't get weird** — read the lines as a manager. They should still tell you how to ask and what to notice. ❌ Not OK if they start telling you what to think about the person, what to conclude, or what to do next week.

4. **Skipping still works** — skip a question. The next panel should still show three sensible cards. ❌ Not OK if it empties out or repeats the previous question's cards.
