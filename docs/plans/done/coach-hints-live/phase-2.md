# Phase 2 — Coaching that re-earns itself each turn

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-08-01 — Carl walked a live 1:1 on sero.team and confirmed the panel moves with the answers, last question included (commits `099b8e76` · `c7dc564e` · `fb8737a7`, live build `fb8737a`)

## Built (2026-07-31)

**The staleness was not where the plan said it was.** The plan blamed `plan-turn.md`'s "copy the item's hints verbatim". That line is real, but changing it alone would have altered nothing on screen. `reconcileQueue` decides what the manager actually sees, and when the planner carries a question forward it calls `isUnchanged(ref, item)` — which compares name, label, description and axis_effects, and does NOT look at hints — then pushes the ORIGINAL question object and discards the planner's payload whole. Fresh hints were being thrown away one line before they reached the queue. A prompt rule on its own would have been correct and completely inert, which is the failure this repo has hit before.

- `backend/engine/reconcile-queue.ts` — the carried-unchanged branch now pushes `{ ...ref, hints: freshHints }` when the planner sent valid hints, and the untouched `ref` when it did not. The question's wording still carries forward verbatim; only the coaching beside it is allowed to move. `ref` is frozen and shared with the turn snapshot, so this copies rather than assigns into it.
- `backend/engine/reconcile-queue.test.ts` — four tests: fresh hints win on a carried question; missing hints keep the old ones; malformed hints fall back to the old ones rather than emptying the panel; the original question object is not mutated.
- `content/prompts/plan-turn.md` — the hints block gains "The FIRST item's hints are always written for THIS moment", with a worked example (if the last answer named "the 14th", a listen line may turn on the 14th). Placed inside the existing hints block, directly above the "carried unchanged" line it overrides, rather than added as a louder paragraph elsewhere. The upstream "copy fields verbatim" bullet now points at the exception so the two do not contradict each other.

Offline proof:
- `npm test` 220/220 (up one file from phase 1's 219), `npm run typecheck` clean, `npm run lint:copy` PASS.
- The four new tests were watched failing first: two red for the right reason ("carried-forward question takes the planner's fresh hints", "does not mutate the original"), two green from the start because they pin the fallback behaviour that already existed.
- `node scripts/replay-scenario.js --regression-all --fixtures-only` — 2 fixtures fail, both on prep-brief `listenFor` capitalisation and full stops. **Pre-existing:** the same 2 fail with these changes stashed. Nothing to do with this phase.

## The paid proof run (2026-07-31) — partial pass, one gap found

`node scripts/gate.js --only biweekly-priya`. **PASS, no regression.** Actual cost **$0.199** (11 calls, 115k tokens), under the $0.35 estimate. Run: `logs/july/2026_Jul31_05-23-bbf91dff66334e1b8893ec69fa194c7d`.

**What it proved.** The planner follows the new rule. For the one question carried across the whole meeting it wrote a DIFFERENT set of hints on all four turns, and the served coaching tracks the conversation: turn 1's answer mentioned a launch, turn 2's hint reads "whether she names one thing, like launch carryover"; turn 2's answer mentioned cleanup and reviews, turn 3's hint reads "whether she stays with reviews and cleanup". Five of the six questions carried coaching written on the turn they were asked.

**What it did not.** The SIXTH question, the last one of the meeting, was served with the question bank's original hints, verbatim. It is the reserved closer: stashed at bank time as a whole question object and injected by the closer gate at the end (`closer gate: reserved closer q_next_two_weeks_76 ...` in the turn-5 issues), so it never passes through the reconcile branch this phase fixed. Every meeting ends on coaching written before the meeting started.

The planner had in fact written four fresh hint sets for that exact question across the run. All four were discarded by the closer path.

## The closer fix (2026-07-31) — half landed, half blocked by another chat's lane

There are **three** places the reserved closer can be put in front, not one:

1. `enforceCloserOnFinalTurn` moves it when it is already in the planner's queue.
2. The same function pulls it from the remaining queue.
3. `session-streams.ts` force-inserts it when the gate found it in neither.

**Done:** a pure `withFreshestHints(closer, pool)` in `backend/engine/queue-manager.ts`, wired into all three of that function's outcomes, with 5 tests in `queue-manager.test.ts` (3 watched red first). It matches the refreshed copy on question TEXT, not alias, because reconcile mints a new alias each rebuild: the stashed closer stays `q_next_two_weeks_76` while its refreshed twin is `q_next_two_weeks_79`. Wording, alias and order are untouched; only the coaching moves. No usable twin leaves it alone, and the copy means `session.closer`, reused every turn, is never mutated.

Path 3 was blocked for a while: `session-streams.ts` was claimed in LANES.md by session `4946b27d` and the lane hook stopped the edit, so it was surfaced to Carl rather than forced. That chat has since finished, committed (`ca343851`, `cba8004e`) and cleared its row, so the lane was re-claimed and the change made. It matters most of the three: turn 5 of the proof run logged `closer gate: reserved closer q_next_two_weeks_76 not found in queue or remaining — could not enforce` before landing here, so fixing the gate alone would have left real runs unchanged.

**Re-proved free, on the paid run's own recorded data.** Rebuilding turn 5's exact state (the bank's stashed closer plus the planner's rebuilt twin from `04-response.json`) and running it through the helper the stream now calls:

- before: "Land it on the next two weeks and keep it concrete." / "Whether she asks for a change in scope, timing, or support." / "Whether the answer points to one thing to do first."
- after: "Keep it open: what would help most over the next two weeks?" / "Whether she asks for scope, time, or a clearer role." / "Whether she names one specific change or stays broad."
- alias unchanged, wording unchanged, stashed closer not mutated.

Worth saying plainly: on THIS run the refreshed closer lines are only modestly different from the stale ones. What changed is that they are now the set the planner wrote on the final turn rather than one written before the meeting, so they move when the conversation gives them something to move on. This run's last answer was thin.

Full suite after the change: **227/227**, typecheck 0 errors, copy guard PASS, design guard clean.

## Still owed before this can be green-lit
- Carl's walk of the scenarios below.

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
