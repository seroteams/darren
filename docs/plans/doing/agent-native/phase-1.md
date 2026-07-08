# Phase 1 — Offline cassette replay for the full pipeline

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Run order:** 2nd (after Phase 2)

## Goal
An agent can replay all 5 pipeline stages offline against recorded model responses — verifying a change or reproducing a bug for $0, with no API key.

## Why
Today only the final-evaluation stage has frozen responses (`evals/replay/`). A change to focus-points / prep / bank / planner can only be exercised with real OpenAI spend + Carl's go-ahead — which is what ends every workstream. The seam already exists: every stage calls the model through **one function**, `callAI()` in `backend/engine/ai-client.ts:130`, each call tagged with a unique `costLabel`.

## Changes
- **`backend/engine/ai-client.ts`** — inside `callAI`, add two env-gated behaviours:
  - `SERO_CASSETTE_RECORD=<dir>`: after a live response, append `{ costLabel, model, system, user, response }` (the raw string `callAI` returns) to `<dir>/cassette.json`.
  - `SERO_CASSETTE_REPLAY=<dir>`: short-circuit **before** `_callOpenAI`/`_callGemini`, return the recorded `response` matched by `costLabel` (+ ordinal for repeated planner turns). Keep `assertNoUnresolvedPlaceholders` running so prompt-fill bugs still surface.
- **`scripts/replay-pipeline.js`** (new) — `<scenario|run-dir> [--cassette <dir>]`: run a scenario through the real engine with replay on, then feed the result to `checkFromSessionDir` in `scripts/lib/check-session.ts` and print verdict + hard-fails. Wire into `npm test`.
- **`scripts/repro-from-bundle.js`** (new) — `<bundle-dir>`: a diagnostic bundle *is* a run folder; ingest it, build the cassette, replay, report whether the reported failure reproduces.

## Watch out for
- The zero-live-run shortcut (building a cassette from an existing `logs/<run-id>/` folder) only works if each stage's on-disk `response.json` is the **raw pre-parse** model string. `evals/replay/` only freezes a `rawResponse` for the final stage — verify the earlier stages before trusting it, else use the RECORD flag.

## Not in this phase
- Reproduction *rubric* for judging output quality (that's Phase 3).
- Any change to the engine's actual behaviour — this is verification plumbing only.

## Reuse
`callAI` seam, `scripts/replay-capture.js`, `scripts/lib/check-session.ts`, the `evals/replay/` layout, and the injectable-engine pattern in `backend/api/services/persona-runs/persona-runs.runner.test.ts`.

## Done when
- [ ] `SERO_CASSETTE_RECORD` produces a `cassette.json` with one entry per stage call.
- [ ] `SERO_CASSETTE_REPLAY` runs the whole pipeline with **no `OPENAI_API_KEY` set** and $0 cost.
- [ ] `scripts/replay-pipeline.js` on a captured cassette reproduces the same deterministic verdict as the live run it came from.
- [ ] `npm test` picks up the new offline check and passes.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. Next phase waits for your green light.
1. **Free replay** — capture one cassette from a real run, then run `node scripts/replay-pipeline.js <scenario> --cassette <dir>` with your API key unset. You should see a full briefing + verdict print, and `cost.json` totalling **$0**. ❌ Not OK if it errors for a missing key or tries to hit the network.
2. **Same verdict** — the replayed verdict + hard-fails should match the original run's `expected`/log verdict exactly. ❌ Not OK if they differ.
3. **Bug reproduce** — point `node scripts/repro-from-bundle.js <a run folder that failed a gate>` at a known-bad run. You should see it reproduce the same failure offline. ❌ Not OK if it passes when the original failed.
4. **Prompt-fill still guarded** — temporarily break a placeholder in a prompt and replay; you should still get the "unresolved placeholder" error (replay doesn't hide prompt bugs).
