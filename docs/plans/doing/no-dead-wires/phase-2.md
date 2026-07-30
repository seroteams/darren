# Phase 2 — The planner learns the room

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The mid-meeting planner reads your intake note, the vocabulary guide, the answer-quality tags and the running score levels, and changes its pacing accordingly.

## Changes
- backend/engine/messages.ts: fill `{{MANAGER_NOTES}}` (intake note) and the three vocabulary placeholders into the planner prompt's cached section; add each turn's answer-quality tag to the transcript the planner sees.
- content/prompts/plan-turn.md: the placeholders above, plus two pacing rules: (a) two thin, dodged or skipped answers in a row means change tack, no third re-drill; (b) do not spend a turn re-confirming an axis already strongly evidenced, aim where the state is thin or contested.
- backend/engine/lexicon.ts + question-generator.ts: vocabulary renderers move to lexicon.ts so both the bank and the planner share them.
- Tests: new backend/engine/messages.test.ts including a prefix-stability test (the cached section must stay byte-identical across turns of one run); question-generator.test.ts extended.

## Not in this phase
- The living-plan mandate (phase 3). Mid-run notes (phase 4). Any change to axis-coverage code (lane-held at planning; evidence-gated).

## Done when
- [ ] A turn prompt in the run log shows the intake note, vocabulary lines and read tags in the right sections (statics before `</session_context>`, tags in the turn state).
- [ ] Prefix-stability test proves the cached section is byte-identical between turns.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy`, replay fixtures all green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Your note echoes in the room** — `live > sero.team > start a 1:1` with a distinctive intake note (name a real project, e.g. "the Odin cutover is slipping"). Answer a couple of questions mentioning it. ✅ Pass: at least one mid-meeting question clearly connects to your note's topic in plain words. ❌ Fail: the note's topic never surfaces, or surfaces as jargon.
2. **Dodging changes the subject** — answer two questions in a row with "fine" or one-word replies. ✅ Pass: the next question visibly changes angle or topic rather than digging the same hole a third time. ❌ Fail: a third near-identical drill on the same thread.
3. **No weird words** — read all questions in one run. ✅ Pass: wording stays plain and role-appropriate (the vocabulary guide at work). ❌ Fail: corporate jargon or terms your report would not use.
