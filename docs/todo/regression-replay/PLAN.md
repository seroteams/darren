# Regression testing — "gate replay" (offline, free)

**Goal:** A free, instant safety net — re-check saved Sero runs after any change and flag anything that drifted, with no AI calls — and surface it as a Regression screen in the app.
**Driver:** Carl
**Created:** 2026-06-14

## Done means
- Running one command (`npm run replay`) re-grades 8 saved runs and prints a green/red table — no AI, no cost.
- The check runs automatically as part of `npm test`.
- A **Regression** item in the app's menu opens a screen with a "Re-check all" button and the green/red table.
- Deliberately weakening a safety rule turns the matching row red (the alarm works).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Free checker (command line) | The checker + capture tool + first 3 saved runs (incl. both safety tests) + `npm run replay` | 🔨 |
| 2 | Full set + automatic | All 8 saved runs + folded into `npm test` | ⬜ |
| 3 | In-app screen | "Regression" menu item + screen (Re-check all + green/red table) | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 in progress** (started 2026-06-14, green-lit by Carl).

Baseline (free, offline): `npm test` → **23/23 passed**, clean. We intentionally do **not** run the paid `npm run gate` as the baseline (cost rule); the offline suite is the baseline.

Phase 1 **built** — `scripts/lib/check-session.js`, `scripts/replay-capture.js`, `scripts/replay-regression.js`, the `npm run replay` script, and 3 captured fixtures (`growth-ahmed`, `leak-devon`, `thin-sam`) in `evals/replay/`. Verified offline, $0:
- `npm run replay` → **3/3 still good**.
- Injected-bad-output check confirms both safety tests bite: a forced confident read on Sam trips `OVERDIAGNOSIS_ON_THIN`; an echoed private worry on Devon trips `PRIVATE_NOTE_LEAK`.
- No engine files changed by this work (reviewer / trust-checks / golden-checks / gate untouched).

**Awaiting Carl's green light** on the phase-1 scenarios. Not committed yet (green light = commit).

⚠️ The working tree also carries unrelated changes from another workstream (a `job-lexicons` feature touching `frontend/client/src/{api,main,router,state,ui/app-nav,ui/stage-labels}.js`, `frontend/server/server.js`, `src/role-profile.js`). Not mine — left untouched. The Phase 1 commit will include only the regression-replay files. Phase 3 (in-app nav) edits some of those same nav files, so coordinate before starting it.

## Parked
- Unify the live paid gate (`scripts/gate.js`) onto the new shared checker, and decide whether the live gate should post-process before checking — has a re-baseline cost, so later.
- Per-turn scoring replay (the in-conversation axis scoring).
- Generation-quality trend baselines with floors (like `scenarios/regression/`).
