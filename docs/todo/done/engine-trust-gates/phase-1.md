# Phase 1 — Session-isolate the question pool

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (automated checks green 2026-06-12: unit 21/21, gate 8/8, post-fix gate run saved planner questions to `_runtime/` only. Product-owner walk-through of the scenarios below still pending.)

**Deviation notes:** plan.js already passed `sessionBank` (committed before this phase) — no edit needed there. `npm run rebuild-question-index` (--prune built in) also removed 290 exact-duplicate YAMLs; every removed file had an identical surviving twin.

## Goal
No question generated in one run can ever be served in another, and the "retry logic" example stops seeding new questions.

## Changes
- `prompts/plan-turn.md` (~line 42): replace the "assumed retry logic covered it" few-shot example with a role-neutral one.
- `src/queue-manager.js` (~443, ~765): runtime-generated questions (planner items, thread-follows) save to `questions/_runtime/` instead of the pool root.
- `src/questions.js`: `scanYamlEntries` skips `_runtime` (like `_archive`) so the index and bank loads stay clean.
- `src/queue-manager.js` (`enforceAxisCoverage` candidate filter, ~628-635): reject candidates with `source: planner_added`, `source: reworded_from*`, or alias starting `q_thread_follow` — load-time filter, no files deleted.
- `frontend/server/handlers/plan.js` + session start: snapshot a `sessionBank` when the session starts (same dedupe as the CLI path) and pass it to `planTurn` — today the web/persona path passes none, which is the live leak path.
- `src/golden-checks.js` + `evals/trust-checks.js`: new detect-only check `CROSS_SESSION_QUESTION_LEAK` — flags a served question using retired-scenario vocabulary (e.g. "retry logic") in a session whose note/transcript never mentioned it.

## Not in this phase
- Filtering note-derived `generated` bank questions (parked).
- Stem quality fixes (Phase 2) and grounding checks (Phase 3).

## Done when
- [ ] `npm run gate` and `npm run smoke` green (baseline recorded in PLAN.md first)
- [ ] `npm run rebuild-question-index` runs clean with `_runtime/` present
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **No more retry logic** — run the junior-designer persona from the bench (same one as the June 6 sweeps). Open the new run's transcript. You should see no question mentioning "retry logic" or anything backend-flavored. ❌ Not OK if any question references something the note/answers never said.
2. **Runtime questions stay out of the pool** — do a short manual run in the app and give one long, meaty answer (so the engine asks a follow-up). After the run, look in `questions/`: the new follow-up YAML should be inside `questions/_runtime/`, not the top level. ❌ Not OK if new `q_thread_follow_*` files appear at the root.
3. **Old artifacts can't come back** — start a fresh run with a note about a *designer*. Watch the questions: nothing should arrive that reads like another job's scenario (billing rewrite, retry logic, architecture review) unless your note mentioned it.
4. **Gate catches it** — ask me to show the gate output: the new `CROSS_SESSION_QUESTION_LEAK` check should be listed green, and I'll show you it failing on a synthetic bad case.
