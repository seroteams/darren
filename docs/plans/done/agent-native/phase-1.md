# Phase 1 — Offline cassette replay for the full pipeline

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested) · **Run order:** 2nd (after Phase 2)

## ✅ GREEN-LIT 2026-07-08 — Carl walked the replay scenarios (commit hash stamped in the tracker commit)

## Built (2026-07-08)
- **`backend/engine/cassette.ts`** (new) + hook in **`ai-client.ts`** `callAI`: `SERO_CASSETTE_REPLAY=<dir>` serves recorded responses (per-label FIFO, reuse-last when live code asks more often than the recording — e.g. a prep validation retry); `SERO_CASSETTE_RECORD=<dir>` appends exactly the raw string `callAI` returns. Replay sits AFTER the placeholder asserts (replay can't hide prompt-fill bugs) and records each call in the cost log honestly at $0/0 tokens.
- **`scripts/lib/cassette-from-run.js`** (new): builds a cassette + scenario from ANY existing run folder — **the recon killed the "needs a paid seed" worry**: every stage logs its raw model string (bank wrapped under `.raw`, planner as `NN-response.json` on runs after ~Jul 01; prep's single raw serves both its labels). $0 seeding.
- **`scripts/replay-pipeline.js`** (new): `<run-dir>` → cassette + scenario → full 5-stage pipeline through the real engine offline (reuses the smoke harness via a new optional `env` param on `runSmoke`) → deterministic verdict via `check-session.ts`.
- **`scripts/repro-from-bundle.js`** (new): judges the bundle as reported, replays it on current code, prints **REPRODUCES: yes/no** with the verdict diff. Exit 0 = bug is real on current code.
- **Tests (all in `npm test`):** `backend/engine/cassette.test.ts` (6: replay no-key/no-network, FIFO+reuse, missing-label error, placeholder guard stays live, record captures raw, record order) + `scripts/test-cassette-from-run.js` (5: labels/order, `.raw` unwrap, turn order, cached-profile absence, scenario synthesis).
- **Live-fire proof (free):** replayed real run `logs/july/2026_Jul01_22-30-eb6e254d…` — full pipeline in **5s, $0.00, 13 calls, no API key touched**; verdict FAIL [INFERRED_STATE_LEAK] **identical to the original judged by current code** → `repro-from-bundle` printed REPRODUCES: yes. (That run predates the no-inference tightening — failing is the correct current-code answer, faithfully reproduced.)
- **Honest notes:** ① replayed sessions are normal session folders (they show in the app's run list — useful for review; my two proof folders were deleted, but their dual-write may have left 2 stray "Priya" rows in the local Neon run table). ② Runs recorded before ~Jul 01 lack per-turn planner raws and can't replay the turn loop — the script says so and exits 2. ③ The offline E2E needs a run folder from `logs/` so it's on-demand, not part of `npm test` (which carries the 11 unit checks); committing a full-run fixture is parked for Carl's call.

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
