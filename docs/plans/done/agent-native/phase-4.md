# Phase 4 — Orchestrator parity guard

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested) · **Run order:** 4th

## ✅ GREEN-LIT 2026-07-08 — Carl walked it (drift demo pre-run for him; commit hash in the tracker stamp)

## Built (2026-07-08)
- **`backend/engine/stage-sequence.ts`** (new, exported via the `index.ts` facade): `STAGE_SEQUENCE` — the 5 stages declared once, each with id / model-config stage / costLabel / engine function+file / CLI driver. The header tells the next agent: change the pipeline → update both orchestrators AND this list.
- **`backend/tests/pipeline/test-stage-parity.js`** (new, auto-runs in `npm test`), four checks:
  1. sequence sanity (5 stages, unique ids, model stages exist in `models.ts`);
  2. **anchored to reality** — each declared costLabel actually appears in its engine file (a stale STAGE_SEQUENCE fails too, not just a drifted orchestrator);
  3. **CLI strict order** — `backend/cli.ts` calls the 5 stage drivers in the declared order (its flow is linear, so source order = execution order);
  4. **web coverage** — `session-streams.ts` invokes every stage's engine function (drop/rename on one side fails).
- **Honest scope note (deviation from the phase sketch):** the web path gets a *coverage* check, not an *order* check — its SSE handlers are HTTP endpoints whose execution order the client drives, so source order proves nothing there (found during build: `evaluate` sits at line 207, `planTurn` at 345, and that's correct). The production orchestrators were deliberately NOT refactored to import the constant (surgical rule; merging them is the parked follow-up).
- **Drift demo (scenario 2, already run):** swapping prep/bank in the sequence → test goes red naming the exact drift ("runPreparationStage runs before runQuestionBankStage — expected …"); revert → green. One self-caught hiccup: the swap/revert via PowerShell mangled the file's em-dash encoding; rewritten clean (ASCII punctuation), content identical.

## Goal
A test fails the moment the web and CLI stage sequences drift apart, so an agent can't half-change the pipeline.

## Why
The stage chain is wired twice with no shared orchestrator: web at `backend/api/services/sessions/session-streams.ts`, CLI at `backend/engine/cli/stages/*` (5 files). A stage-wiring change must edit both, and only the paid gate catches a mismatch today.

## Changes
- **`backend/engine/`** — export a declarative `STAGE_SEQUENCE` (ids + order + prompt-stage mapping) from the facade `index.ts`. Canonical stage list already lives at `backend/engine/models.ts:8`.
- Have both orchestrators reference that constant (or, minimally, derive their order from it).
- **New offline test** — asserts the web path and the CLI path produce the same ordered stage sequence; fails if they diverge.

## Not in this phase
- **Merging** the two orchestrators into one — bigger and riskier, parked. This phase only *guards* parity.

## Reuse
`backend/engine/models.ts:8` (canonical stage list), `backend/engine/index.ts` (facade).

## Done when
- [ ] `STAGE_SEQUENCE` is exported and both paths reference it.
- [ ] A new offline test passes on the current code and **fails** if either path's stage order is hand-broken.
- [ ] `npm test` includes it.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. Next phase waits for your green light.
1. **Passes clean** — run `npm test`. The new parity test passes. ❌ Not OK if it fails on untouched code.
2. **Catches drift** — I'll temporarily reorder one stage in the CLI path and re-run `npm test`. You should see the parity test go red with a clear message naming the mismatch. Then I revert. ❌ Not OK if it stays green.
