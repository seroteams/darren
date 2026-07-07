# Plan-turn runner gates

**Goal:** Promote the plan-turn.md contract rules from "model is asked to obey" to "runner enforces in code", so a malformed or off-contract model response can't leak through — and stop engine-only note tags from reaching surfaces they shouldn't.
**Driver:** Carl
**Created:** 2026-07-07

## Background
The prompt [content/prompts/plan-turn.md](../../../content/prompts/plan-turn.md) states many hard rules, but several are only *stated* — the model is trusted to follow them. This plan makes the 100%-code-checkable ones into real runtime gates in the engine, mirroring the ones that already exist (grounding drop, shallow damping, drill cap, thread-follow, axis coverage, relational-arc competency drop, delta clamp).

## Done means
- A model response that violates a mechanical rule (bad axis id, >18-word name, missing key, over-budget queue, wrong closer on the final turn, dangling ref_alias) is caught and repaired/dropped by the runner — not passed downstream.
- Engine-only note tags (`[SHALLOW]`, `[THREAD-DEFERRED]`, etc.) are stripped at the presentation/export boundary, *after* the decision logic that legitimately reads them.
- Each new gate has a mirrored unit test; `npm test` stays green.

## Resolved before we start (from code exploration)
- **`description` is consumed** (admin prep UI: questioning.js, onepage.js) → **keep it**, do not cut from the contract. Spec's "cut description" branch does not fire.
- **Already in code, not new work** — relational-arc competency drop ([reconcile-queue.ts](../../../backend/engine/reconcile-queue.ts) ~L180–188) and axis-∈-signature clamp (`clampToSignature`, [queue-manager.ts](../../../backend/engine/queue-manager.ts) ~L138–175). We add regression tests to lock them, we don't rebuild them.
- **`label` flows to UI/streams; `description` is admin-only** (not sent over SSE) — both are real, neither is dead.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Item-shape gates | Per-item validation in reconcile: axis-id whitelist, name ≤18 words, all-8-keys present → repair or drop | ✅ green-lit + committed `0d4325f1` |
| 2 | Queue-shape gates | Cross-item gates in the planTurn gate sequence: budget length, closer-on-final-turn, dangling ref_alias drop (+ regression tests locking the two existing gates) | ⬜ |
| 3 | Note-tag leak strip | Strip `[TAG]` engine vocab from `assessment.note` at the evaluation-input / export boundary, after decision logic reads it (ENGINE_VOCAB_LEAK / PRIVATE_NOTE_LEAK) | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit + committed (`0d4325f1`) 2026-07-07. Phase 2 is next (⬜, awaiting Carl's go — one phase per run).**

- **Baseline (free, 2026-07-07):** `npm test` **82/83** — one pre-existing failure, `test-replay-regression.js` (`FOCUS_SHAPE_LEAK`), unrelated to reconcile item-shape. Recorded so it's not blamed on this work.
- **What landed in Phase 1** ([reconcile-queue.ts](../../../backend/engine/reconcile-queue.ts)):
  - Axis-whitelist empty-guard now checks the *whitelisted* axis set, so an item whose every axis id is off the four-axis whitelist is dropped (or inherits a ref's signature) instead of materialising an empty `{}`.
  - New `plannerNameIssue` gate: planner-written (new/reworded) names that are empty or >18 words are dropped (reworded items fall back to the untouched original, mirroring the grounding gate). Carried-unchanged items exempt.
  - Field-completeness confirmed already handled by the `?? ""` / `?? null` defaults at materialisation; the only unsafe cases (empty name, empty axis) are the two above.
  - Two exported pure helpers (`nameWordCount`, `plannerNameIssue`) + `reconcile-queue.test.ts` (6 tests, node:test).
- **Free checks after:** `npm test` **83/84** (the +1 is the new test file; same single pre-existing failure) · `tsc --noEmit` clean.
- **Not committed yet** — waiting on green light (method: green light = commit). On green light I'll commit path-scoped and refresh STATUS.md.

**Baseline note (cost):** `npm run gate` is paid (~$3). Used free `npm test` as the baseline per the cost rule; paid gate only on Carl's explicit OK.

## Parked
- "Cut `description` from the contract" — **not needed**, it's consumed by the admin UI. Closed.
- Gates for `[COMMITMENT]` / `[THREAD-DEFERRED]` / `[NO-REPORT-SIGNAL]` *tracking* (surfacing the deferred thread next session) — that's a feature, not a validation gate. Out of scope here.
- Promoting these gate checks into `npm run gate`'s pass/fail assertions (vs. just runner enforcement) — revisit after all three phases land.

## Input from overnight QA (2026-07-07, not this plan's scope — routed here by Carl)
Two *behaviour* findings from the QA's 4 paid runs (full write-up in [docs/NIGHT-TEST-REPORT.md](../../NIGHT-TEST-REPORT.md), Phase 4b). Adjacent to this plan's *validation-gate* work but distinct (behaviour, not shape) — logged here so the runner owner has the evidence; likely its own follow-up plan, not a phase here.
- **Thread-follow drifts mid-session (the #1 signal).** All 4 runs scored lowest on thread coherence; deterministic `plan_thread_follow` = **0.25–0.50** every run. Pattern: the planner threads well for ~4 turns, then reverts to generic seed questions that ignore the live answer (e.g. performance-tom turns 5–7 fired recovery/pace questions off Tom's live cross-team-judgment thread). Never trips a hard-fail, so the gate stays green while the conversation drifts.
- **Growth arc skips stages mid-serve.** growth-ahmed served only anchor/aspiration/commitment of the 5 growth stages — **gap and investment never served** — so the closer lands without the trade-off stage. The arc *config* is correct (`growth/type.ts`: 2/2/2/2/1 = 9), so this is a *serving/coverage* gap in the runner, same root as the thread-follow drift.
