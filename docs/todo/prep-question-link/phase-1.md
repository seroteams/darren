# Phase 1 — Opener link

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Make the first real question in a run carry the prep brief's opening question — reworded to sound natural after the warm opener, not pasted word-for-word.

## Changes
- Pass the prep brief (`openingQuestion`, `coreIssue`, `listenFor`) into the question-bank generator. Right now the brief is shown to the manager and then thrown away — nothing downstream sees it.
- Wire this through **both** runtimes: the CLI (`cli.js` → question-bank stage) and the frontend server (the bank handler), since the Liam run came from the frontend.
- Teach the question-bank prompt: keep the warm generic opener at position 0, but make the first substantive question (position 1) restate the prep opening question's intent in fresh words, and keep every question tied to the core issue or a listen-for point.

Files: `cli.js`, `src/cli/stages/question-bank.js`, `frontend/server/handlers/bank.js`, `src/question-generator.js`, `prompts/generate-questions.md`.

## Not in this phase
- Stay-on-brief during the live conversation (the planner) — that's Phase 2.
- The `opener_link` / `on_brief` diagnostics — Phase 2.

## Done when
- [ ] A run's first real question is a reworded version of the prep opening question.
- [ ] `npm run gate` and `npm run smoke` stay green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Phase 2 waits for your green light.

1. **Liam-style performance run** — start a Performance & feedback 1:1 with notes like Liam's ("works hard, but stakeholders unclear on decisions and next steps"). Read the prep brief's opening question, then start the conversation. You should see the **first real question say the same thing in different words**. ❌ Not OK if it opens with a generic "anything you want to cover today?" and only gets to the topic later, or if it pastes the opening question word-for-word.

2. **Opener vs focus point** — pick a scenario where the brief's opening question and the focus points point at slightly different things. The first real question should follow the **opening question**, not the raw focus point.

3. **Relational meeting still safe** — run a bi-weekly check-in or "something feels off" 1:1. Confirm it still feels supportive and doesn't turn into a performance probe. (I'll also run `npm run gate --only feels-off-james` and show you it's still green.)
