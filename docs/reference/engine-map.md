# Engine map — read before any engine change

One page: where the pipeline lives, what "correct" means, and the couplings that bite.
(Created 2026-07-08 as part of the agent-native workstream, phase 2.)

## The pipeline (5 stages + one side input)

| # | Stage | Entry function | File | Run log folder |
|---|-------|----------------|------|----------------|
| — | role profile (side input) | `loadRoleProfile` | `backend/engine/role-profile.ts` | `00b-role-profile/` |
| 1 | focus points | `generateFocusPoints` | `backend/engine/generate.ts` | `01-focus-points/` |
| 2 | preparation | `generatePreparation` | `backend/engine/preparation.ts` | `01b-preparation/` |
| 3 | question bank | `generateBankWithFallback` | `backend/engine/question-generator.ts` | `03-question-bank/` |
| 4 | planner (per-turn loop) | `planTurn` | `backend/engine/queue-manager.ts` | `04-dynamic-answers/NN-*` |
| 5 | evaluation / briefing | `evaluate` | `backend/engine/reviewer.ts` | `05-evaluation/` |

- **Public facade:** `backend/engine/index.ts` — consume the engine through this, not by reaching into internals.
- **Every model call** goes through one function: `callAI()` in `backend/engine/ai-client.ts`. That is the seam for interception (recording, replay, provider switch).
- **State:** one `Session` object threads through everything — contract in `backend/shared/session.types.ts`.
- **Prompts:** `content/prompts/` (8 `.md` files + `rule-registry.ts`, the prompt↔gate coupling registry verified by `scripts/test-rule-registry.js` in `npm test`), per-meeting-type overlays in `backend/engine/one-on-one-types/<slug>/type.ts`.
- **Other model-call surfaces (added after this map was first drawn):** the guided check-in runner (`backend/engine/guided/wrapup.ts` + `content/prompts/guided-wrapup.md`) and the lexicon review stage (`backend/engine/lexicon-reviewer.ts` + `backend/engine/lexicon/` + `content/prompts/review-session-for-lexicon.md`). Both carry prompts — treat them with the same care as the 5 stages.

## ⚠️ The two orchestrators — must move in lockstep

The stage chain is wired **twice**. A change to stage wiring must be made in **both**:

| Path | File(s) |
|---|---|
| Web (production, SSE) | `backend/api/services/sessions/session-streams.ts` |
| CLI / batch (gate, smoke) | `backend/engine/cli/stages/*.ts` (5 files), driven by `backend/cli.ts` |

Nothing enforces parity today except the paid gate (the offline `test-stage-parity.js` asserts stage
*presence/order* only, not per-stage inputs). If you change one, grep the other. Known input-level
divergences between the two paths are catalogued in `audits/REPO_SWEEP.md` §4 (2026-07-18, 11 findings).
A **third** orchestration also exists: `backend/api/services/persona-runs/persona-runs.runner.ts`
(the scripted QA lane) — its divergence from the live path is deliberate, but stage-wiring changes
should be checked against it too.

## What "correct" means

There is no oracle in the code. Correct = **the deterministic gates pass on human-ratified cases**:

- **Gate criteria (code rules, not model judgment):** `evals/trust-checks.ts`, with detector bodies in `backend/engine/golden-checks.ts` (~20 functions: `runFocusArcGate` / FOCUS_ARC_LEAK, briefing bans, cross-session leak, grounding, axis silence…).
- **Ratified cases:** `evals/golden/<id>.json` — each pins a scenario + the expected verdict. Includes adversarial sentinels.
- **Offline regression (free):** `npm run replay` re-grades frozen final-stage outputs in `evals/replay/` — $0, deterministic.
- **Live regression (paid):** `npm run gate` (~$3 full, ~$0.35 single case via `node scripts/gate.js --only <id>`) — needs a go-ahead per the cost rule.

## Couplings that bite (check before you edit)

1. **Prompt ↔ gate regex.** Prompt rules (e.g. the focus-reason opener wording) are mirrored as hardcoded regexes in `golden-checks.ts`/`trust-checks.ts`. Editing a prompt rule without its regex breaks the gate silently.
2. **`reviewer.ts` ↔ `golden-checks.ts` import each other** (function-level circular dep). The "detect" layer and the "adjust-scores" layer must be read together.
3. **Detector constants are incident history.** Ban/jargon/rule-echo lists in `golden-checks.ts` grew from dated production failures (see inline comments). Don't prune them as "cleanup."
4. **Honesty rule (standing, from CLAUDE.md):** detect and flag problems — never hardcode a text rewrite to mask model output.
5. **Focus-arc rule:** bi-weekly and feels-off arcs exclude competency content — input filter in `generate.ts` (`catalogueForArc`) + backstop gate (`runFocusArcGate`). Single source: `backend/engine/relational-arcs.ts`.

## Verify a change (cheapest first)

1. `npm run typecheck` + `npm test` — free, offline, ~1 min.
2. `node scripts/replay-scenario.js <id> --fixtures-only` — free validator fixtures.
3. `npm run replay` — free deterministic re-grade of frozen runs.
4. Only if a live model behaviour genuinely can't be proven offline: **one** paid run, smallest case, cost stated first (`node scripts/gate.js --only <case>` ≈ $0.35).

## Run logs (the assertion surface)

Every run writes `logs/<month>/<run-id>/` — per-stage `inputs.json` + `prompt.md` + `response.json`, plus `transcript.json`, `axis-state.json`, `cost.json`. Scripts assert against this layout (`scripts/lib/check-session.ts`); it is stable — treat it as an interface.
