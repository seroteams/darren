# Phase 1 — Backend stage I/O

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Serve each stage's input / exact prompt / raw reply for any run over one endpoint, and stop throwing away the Live Q&A prompts.

## Changes
- **Persist Q&A-turn prompts.** In `frontend/server/handlers/plan.js` (the turn-file write), add the `prompt` and `response` the planner already returns. Mirror the same in the CLI loop `src/cli/stages/questioning.js` so CLI and live logs match.
- **Read the whole run.** Add `readRunStages(id)` to `src/run-history.js` — reuses the existing `findRunDir()` + `readJsonAt()`. Returns the stages in order (focus areas → prep → questions → Live Q&A turns → synthesis); each carries its inputs, exact prompt, raw reply, and the shipped result where one was logged. Missing folders are simply skipped (so a half-finished run returns what it has).
- **Endpoint.** Add a `stages` handler to `frontend/server/handlers/runs.js` and register `GET /api/runs/:id/stages` in `frontend/server/server.js`. Add a matching `getRunStages(id)` fetch wrapper in `frontend/client/src/api.js`.

## Not in this phase
- Any UI. No tabs, no rail changes — this is data only.

## Done when
- [ ] `GET /api/runs/<id>/stages` returns every stage with its inputs, prompt, and raw reply (plus shipped result where logged), and a turns list for Live Q&A.
- [ ] `npm test` is green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
This phase has no screen yet — it's the plumbing the tabs will read. You can confirm it from the browser address bar / a tab while the API is running.

1. **The data is there for an old run** — open `http://localhost:3001/api/runs/<an-existing-run-id>/stages` (use a run id from your logs). You should see a list of stages (focus areas, prep brief, questions, live Q&A, synthesis), each with the text that was sent to the AI and the AI's raw reply. ❌ Not OK if it's empty, errors, or a stage is missing its prompt/reply.
2. **Unknown run is handled** — open the same URL with a made-up id like `/api/runs/nope/stages`. You should get a clean "not found", not a crash. ❌ Not OK if the server errors out.
3. **Nothing else broke** — start a normal session and click through a stage or two as usual. Everything should work exactly as before (this phase only added a new read-only endpoint). ❌ Not OK if anything in the normal flow changed.
4. *(Optional, needs a live run — paid)* **New Q&A prompts get saved** — after a fresh run that asks questions, the `/stages` endpoint's Live Q&A turns should each include the prompt that was sent. (Older runs won't have this — that's expected.)
