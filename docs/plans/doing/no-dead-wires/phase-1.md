# Phase 1 — Plan meets reality

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-30 — Carl chose "A · tested, good" on the scenario hand-off (commit 4f85e144, live on sero.team in build 4f85e14 via a parallel chat's go-live)

## Built (2026-07-30)
- Engine: backend/engine/reviewer.ts (formatPrepBrief formatter, `{{PREP_BRIEF}}` fill, prep threaded through EvaluateArgs/BuildMessagesArgs/assembleEvaluation/evaluate, prep recorded in the run log's inputs.json).
- Prompt: content/prompts/final-evaluation.md (`<prep_follow_through_rule>` + user-input block).
- Callers: session-streams.ts (live), evaluation-inputs.ts (S1b preview picks it up automatically via assembleEvaluation), persona-runs.runner.ts, cli.ts + cli/stages/evaluation.ts.
- Tests: backend/engine/reviewer.prep-brief.test.ts (5 tests, TDD red-first), evaluation-inputs.test.ts +2.
- Offline proof: npm test 216/216 · typecheck clean · lint:copy clean · replay fixtures: offline checks pass; 2 prep-validator fixture failures are PRE-EXISTING (introduced by commit 832d63da's capitalisation rule, unrelated to this diff; already chipped as the prep-retry cost leak).

## Goal
The final briefing sees the prep brief and tells you, honestly, whether the meeting did what you set out to do.

## Changes
- backend/engine/reviewer.ts: prep brief threaded into the evaluation prompt (new `{{PREP_BRIEF}}` placeholder, formatter with a plain sentinel when no brief exists, logged into the run's inputs.json).
- content/prompts/final-evaluation.md: prep-brief block in user input + a `<prep_follow_through_rule>`: the plan is not evidence; say plan-vs-reality once ("You set out to..."); reached / touched but unresolved / never surfaced; never fabricate follow-through; never present the brief's wording as the report's words.
- One-line callers: session-streams.ts (live), evaluation-inputs.ts (preview), persona-runs.runner.ts (QA), cli.ts + cli/stages/evaluation.ts.
- Tests: evaluation-inputs.test.ts extended; new backend/engine/reviewer.prep-brief.test.ts.

## Not in this phase
- Any change to the recap screens (folds into existing brief fields; a dedicated card is a later option).
- Planner changes (phases 2-3), notes changes (phase 4).

## Done when
- [ ] The assembled evaluation prompt (S1b preview) shows the prep brief block, and shows the sentinel when prep was discarded.
- [ ] The live run log (05-evaluation/inputs.json) records the prep brief that was sent.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy`, replay fixtures all green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The plan comes back at the end** — `live > sero.team > run a full 1:1` (any meeting type, write a real intake note, accept the prep brief, answer the questions normally, finish). On the final brief, look for one line about what you set out to do. ✅ Pass: it names your plan and says plainly whether the meeting got there, partly got there, or never reached it. ❌ Fail: no mention of your plan anywhere, or it claims something happened that did not.
2. **It never invents follow-through** — same run as above: skip or dodge the questions that relate to your prep focus. ✅ Pass: the brief says the plan was not reached ("the session did not get to it" or similar). ❌ Fail: it says you achieved or agreed something you never discussed.
3. **No prep, no ghost** — start a run and discard the prep brief (or skip past it), finish the meeting. ✅ Pass: the final brief reads normally and never mentions a plan or prep. ❌ Fail: it references a plan you never had.
