# Phase 1 — Free checker (command line)

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 (built — awaiting product-owner test)

## Goal
A free, offline checker you can run from the command line that re-grades a saved run and says "still good" or "needs a look" — proven on 3 saved runs including both safety tests.

## Changes
- New `scripts/lib/check-session.js` — the shared "re-grade a saved run" logic (parse the saved AI output → run the 4 post-process guards → run all 11 safety gates). Reuses existing engine code; the live paid gate (`scripts/gate.js`) is left untouched.
- New `scripts/replay-capture.js` — freezes a finished run folder into a saved case under `evals/replay/<id>/` (`input.json` = the frozen run, `expected.json` = the correct result computed by current code).
- New `scripts/replay-regression.js` — the runner: re-grades every saved case and prints a green/red table. Flags any drift in **either** direction (so a silenced safety test is caught).
- Capture 3 cases into `evals/replay/`: one healthy (Ahmed, growth) + the two safety tests (Devon — private-worry leak; Sam — thin answers). Add `evals/replay/_index.json`.
- Add `npm run replay`.

## Not in this phase
- The other 5 saved runs (Phase 2).
- Running automatically inside `npm test` (Phase 2).
- The in-app screen (Phase 3).

## Done when
- [ ] `npm run replay` re-grades 3 saved runs offline and prints a clear green/red table.
- [ ] No AI is called and nothing costs money.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **It runs and it's green** — In a terminal, run `npm run replay`. You should see 3 rows — Ahmed, Devon, Sam — all marked "still good" (green). The two safety tests (Devon, Sam) should be labelled as such. ❌ Not OK if it errors, asks for an API key, or charges anything.
2. **It's fast and free** — It should finish in about a second, with no "calling the model" step. ❌ Not OK if it's slow or mentions spending money.
3. **The alarm works** (optional, I'll help) — Ask me to "simulate a break". I'll weaken one safety rule on a throwaway copy; re-run `npm run replay` and a row should flip to red "needs a look" with a plain note of what changed. Then I'll undo it and the row goes green again.
