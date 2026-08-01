# Regression rerun board

**Goal:** After engine changes, Carl presses Rerun and the 8 frozen test managers go through the current engine again; safety checks, one AI reviewer and Carl himself each say whether it got better or worse.
**Driver:** Carl
**Created:** 2026-07-31
**Mockup:** https://claude.ai/code/artifact/2f58f42b-7cd9-4b78-8732-e038337bb95f — awaiting Carl's nod (setup 2026-07-31)
**Board:** https://claude.ai/code/artifact/89c153cc-fc8e-4b15-9b20-ee6afc141776

## Done means
- A "Regression" screen in the admin (local AND live) listing the 8 frozen cases with their latest verdicts.
- Rerun (one case or all 8) runs the real engine with the frozen inputs, adapting to whatever shape the engine is now. Local only; live shows a polite "switched off" state (Carl's call, 2026-07-31).
- Every rerun shows: free safety-check verdict vs the ratified baseline, an AI reviewer score with better/same/worse vs last time, and a link into the existing /run/:id tool for Carl's own rating.
- History groups past batches and names the prompt-version fingerprint, so a red batch points at what changed.
- **No bad result is a dead end:** every red or "worse" row explains itself in plain English, names what changed in the engine since it was last good, and hands over a ready-to-paste fix brief. Fix, rerun that one case, watch the arrow flip.

## Resolved before we start
- **Frozen inputs that survive engine restructuring:** `content/scenarios/**` smoke-shape scenarios (positional answers → whatever question the current engine asks). Suite = `evals/golden/_index.json` (8 cases).
- **Paid run machinery:** mirror `backend/api/services/persona-runs/` (runner shape, single job slot, progress polling, cost backstop) — NOT the CLI/stdin lane.
- **Hard grading:** `evals/trust-checks.ts::runTrustChecks` vs each case's `expect`, exact `gate.js` semantics. AI reviewer is advisory only.
- **AI reviewer:** ONE strong judge call per case (Carl's call, 2026-07-31): same 8 dimensions as the review tool (`REVIEW_DIM_KEYS`) + head-to-head vs the previous rerun. `modelFor("judge")`, ~$0.05.
- **Storage, no migration:** `sessions.run_label = "regression:<batchId>:<caseId>"`; verdicts via `logRunRoot("trust-checks.json"/"judge.json")` → run_artifacts (pg) + local disk echo. Live has no logs/ dir — Postgres only.
- **Naming:** everything new is `regression-runs` (the existing FREE service is already called `regression`).
- **Committee (2026-07-31):** Seibel ⚠️ keep it small, validation first · Willison ✅ deterministic gate + advisory judge is right, feed the suite real failures · Majors ⚠️ surface promptVersion on history · real user — no signal. Log: `logs/committee/2026-07-31-regression-rerun-board.html`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The screen, free parts | /regression lists the 8 cases + free safety strip; no paid anything | ✅ |
| 2 | Paid rerun of one case | Rerun button → real engine run → trust verdict → open in /run/:id | ⬜ |
| 3 | The AI reviewer | Committee column: score /5 + better/same/worse vs last rerun | ⬜ |
| 4 | Rerun all + history | One-click batch of 8, batch history with prompt fingerprint, compare link | ⬜ |
| 5 | Live + bless baseline | Live shows the screen honestly (reruns off); local "bless as baseline" | ⬜ |
| 6 | When it goes red | Plain-English diagnosis, what changed since good, copy-paste fix brief, rerun to verify | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit 2026-07-31** (commit 2365e7b0). Carl walked `/regression`: 8 frozen cases listed with meeting types, adversarial chips on Devon and Sam, every row "Never rerun", and the free safety check re-ran clean ("7 still good"). Offline proof at the time: `npm test` 223/223, typecheck clean, `lint:copy` clean.

**Phase 2 🔨 next** — the paid rerun of one case. Cost note: Phase 2's single QA rerun (~$0.35) IS this task's one paid run, so the `npm run gate` baseline (~$3) is deliberately NOT run; the first rerun doubles as the calibration read (see Risks #2 in the approved plan).

**How a bad result turns into a fix (Phase 6, in plain English):** the board says a case got worse → "What now" explains it without jargon and lists what changed in the engine since that case was last good → Copy fix brief gives a self-contained prompt for a fresh Claude chat (case, evidence, suspect files, and the rule that it proposes options rather than applying them) → after the fix, Rerun this case from the same panel and watch the arrow flip. The other branch is there too: if the new behaviour is actually right, bless it as the new normal.
Free machinery this leans on, already in the repo: `diffLocks()` in `backend/engine/pipeline-lock.ts` already names changed prompt files in plain English ("Evaluation / briefing"); `FIX_MAP` in `admin/src/ui/review-serialize.js` already maps each failing dimension to the files that own it; `POST /api/v1/suggest-fix` already gives an in-app AI read.
Baseline note: free checks (`npm test`, `npm run typecheck`) are the baseline for Phases 1; an `npm run gate` baseline (~$3, paid) is deferred to the start of Phase 2 and needs Carl's nod first.

## Parked
- "Capture this real run into the suite" button (Willison: suite must grow from real failures — including the six open Jul-16 sweep findings, none frozen as a case yet).
- Library filter for `regression:` runs.
- Turn-loop convergence (this adds the third mirror of planStream's queue policy — persona runner precedent).
- Three-voice judge panel upgrade (Carl chose one reviewer; panel is a config-shaped change later).
- Enabling paid reruns on live (one-line switch: delete the blockOnLive wrapper + flip `canRerun`).
