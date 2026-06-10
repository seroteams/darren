# Phase 1 — Opener link

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Make the first real question in a run carry the prep brief's opening question — reworded to sound natural after the warm opener, not pasted word-for-word, and asked *early* (not buried at question 5).

## Two things we confirmed that shape this
- **The opener has to be placed early, not just generated.** The first 4 questions normally come from fixed intro questions; freshly-made questions only show up from question 5 onward. So we generate the prep-anchored question conversantly **and slot it in right after the warm opener**, ahead of the fixed intro probes (it replaces the first fixed probe, so the total number of questions doesn't change).
- **This only shows in a live (manual) run.** Scripted persona runs — like the "Run 4 of 12" review — freeze the question list on purpose, so they won't show this change. That's expected. QA has to be a manual run.

## Changes
- Pass the prep brief (opening question, core issue, listen-for) into the question generator. Today the brief is shown to the manager and then thrown away.
- Wire it through **both** live runtimes: the CLI and the frontend server (manual mode). Leave the scripted path untouched.
- Teach the generator to produce one question that restates the prep opening question in fresh words, and place it first among the substantive questions.

Files: `cli.js`, `src/cli/stages/question-bank.js`, `frontend/server/handlers/bank.js`, `frontend/server/handlers/start.js`, `src/question-generator.js`, `prompts/generate-questions.md`.

## Not in this phase
- Keeping later questions on-brief during the live conversation (the planner) — Phase 2.
- The `opener_link` / `on_brief` diagnostics — Phase 2.

## Done when
- [ ] In a manual run, the first real question (right after the warm opener) is a reworded version of the prep opening question.
- [ ] `npm run gate` and `npm run smoke` stay green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself, in a **manual** run (not a scripted persona run). Phase 2 waits for your green light.

1. **Liam-style manual run** — start a Performance & feedback 1:1 with notes like Liam's ("works hard, but stakeholders unclear on decisions and next steps"), in manual mode. Read the prep brief's opening question, then start the conversation. After the warm opener, the **first real question should say the same thing in different words**. ❌ Not OK if it stays generic ("anything to cover?"), pastes the opening question word-for-word, or only reaches the topic around question 5.

2. **Opener vs focus point** — pick a scenario where the brief's opening question points at something slightly different from the focus points. The early question should follow the **opening question**.

3. **Relational meeting still safe** — run a bi-weekly check-in or "something feels off" 1:1. Confirm it still feels supportive and doesn't turn into a performance probe. (I'll also run `npm run gate --only feels-off-james` and show you it's still green.)
