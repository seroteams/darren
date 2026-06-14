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
| 2 | Full set + automatic | 7 cases (5 personas + 2 safety) + folded into `npm test` | ✅ |
| 3 | In-app screen | "Regression" menu item + screen (Re-check all + green/red table) | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state

**2026-06-14 — persona suite + Personas page landed.** Regression suite = **5 homepage personas —
Maya Chen (Performance), Jordan Kim (Growth), Sofia Martinez (Bi-weekly), Rachel Singh + Marcus Lee
(Something feels off)** + 2 safety tests (`leak-devon`, `thin-sam`) = **7 cases, all PASS** via
`npm run replay` and in-app `/regression`. Maya/Jordan/Marcus captured $0 from existing logs;
Sofia + Rachel from **fresh paid runs** (`node smoke-test.js`, ~$0.78 total, approved). Re-check
feedback fix also done. Suite enriched with persona `displayName`/`issue` from `config/persona-bench-v1.json`.

**New: Personas page + nav.** Added `frontend/client/src/stages/personas.js` + a **Personas** nav
link (registered in state/main/router/app-nav/stage-labels). Lists all 12 persona-bench personas
(role · seniority · meeting type · issue + a collapsible scripted conversation) and badges the 5
that are **in the regression suite**. Reuses the existing `/api/persona-bench` endpoint (no backend
change) + `runRegression` for the badge. **Front-ends aligned:** homepage demo dropdown, Personas
page, and Regression suite all source from `config/persona-bench-v1.json` (one cast).

Capture gotcha (for future): only Maya/Jordan/Marcus had clean $0 runs on disk; the web run path
doesn't log `03-question-bank`, and the Jun06–07 sweep dir holds `.md` summaries only — so most
personas' saved runs are bankless and fail `WRONG_MEETING_TYPE` on replay. Fresh fixtures must come
via `node smoke-test.js <scenario>` (CLI path logs the bank). Server (3001) on current code.

---
### Prior state
**Phase 1 in progress** (started 2026-06-14, green-lit by Carl).

Baseline (free, offline): `npm test` → **23/23 passed**, clean. We intentionally do **not** run the paid `npm run gate` as the baseline (cost rule); the offline suite is the baseline.

Phase 1 **built** — `scripts/lib/check-session.js`, `scripts/replay-capture.js`, `scripts/replay-regression.js`, the `npm run replay` script, and 3 captured fixtures (`growth-ahmed`, `leak-devon`, `thin-sam`) in `evals/replay/`. Verified offline, $0:
- `npm run replay` → **3/3 still good**.
- Injected-bad-output check confirms both safety tests bite: a forced confident read on Sam trips `OVERDIAGNOSIS_ON_THIN`; an echoed private worry on Devon trips `PRIVATE_NOTE_LEAK`.
- No engine files changed by this work (reviewer / trust-checks / golden-checks / gate untouched).

**Phase 3 also built** (jumped ahead at Carl's request — he wanted to see it in the app). Added a **Regression** nav item + screen (`frontend/client/src/stages/regression.js`) backed by a new offline endpoint `GET /api/regression/run` (`frontend/server/handlers/regression.js`), both reusing a shared suite runner (`scripts/lib/check-session.js` + `scripts/lib/replay-suite.js`; `scripts/replay-regression.js` slimmed to a CLI front-end). Verified live: endpoint returns 3/3 OK; the screen renders the green list via the in-app nav (Home → Regression). Restarted the stale API on 3001 and started Vite on 3000 (preview) to serve it.

**Phase 2 done** — 7 cases (5 personas + 2 safety) + folded into `npm test`, so the suite runs
automatically on every test pass (`npm test` → 26/26, offline, $0) via `scripts/test-replay-regression.js`.

**Awaiting Carl's green light.** Nothing committed yet (green light = commit).

⚠️ Commit collision (now active): Phase 3's nav edits share files with the in-progress `job-lexicons` workstream — `frontend/client/src/{api,main,router,state}.js`, `frontend/client/src/ui/{app-nav,stage-labels}.js`, `frontend/server/server.js` (and `src/role-profile.js`, theirs). Those files now hold BOTH features' uncommitted changes. At commit time, stage only the regression hunks or coordinate with that workstream — don't sweep their changes into the regression commit. Purely-mine files: `scripts/lib/{check-session,replay-suite}.js`, `scripts/replay-regression.js`, `scripts/replay-capture.js`, `evals/replay/*`, `frontend/server/handlers/regression.js`, `frontend/client/src/stages/regression.js`, `package.json` (replay script).

## Parked
- Unify the live paid gate (`scripts/gate.js`) onto the new shared checker, and decide whether the live gate should post-process before checking — has a re-baseline cost, so later.
- Per-turn scoring replay (the in-conversation axis scoring).
- Generation-quality trend baselines with floors (like `scenarios/regression/`).
