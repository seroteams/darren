# Phase 5 — Axis accumulation (re-baseline phase)

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 coded, offline green 2026-06-13 (reconcileQueue inherits signatures from refs — tested; scripted lane resolves signatures by alias; AXIS_SILENT_SESSION warning tested both ways). Live scripted-persona re-run + gate diff ratification + the one `--update-baseline` pending.

## Follow-up (2026-06-13) — alias-bridge fix for the scripted lane
A deep dive on the axis layer found the scripted-persona QA lane shipping every axis "not read" even on signal-rich runs (e.g. [Jun12_21-59](../../../logs/june/2026_Jun12_21-59-d8091c4a/05-evaluation/final.json): a full growth/ownership conversation, all four axes "this didn't come up"). 30 of 31 scripted runs booked zero axis signal.

**Root cause:** scripts reference pool aliases like `q_ownership_step`, but `newAlias()` prepended another `q_` when those questions were saved, so the bank stores them as `q_q_ownership_step`. `scriptSignature`'s `loadQuestion(item.alias)` missed the file, the `catch` swallowed it, the signature stayed `{}`, and `clampToSignature` zeroed every delta.

**Fix:** [`frontend/server/persona-script.js`](../../../frontend/server/persona-script.js) `scriptSignature` now tries the literal alias *then* the doubled-prefix variant. Resolution went 18/62 → 58/62 distinct bench aliases. No bank churn (respects "never bulk-edit questions/"). Guarded by [`scripts/test-persona-bench.js`](../../../scripts/test-persona-bench.js) (offline). The 4 still-empty aliases (`q_open_anything_to_cover`, `q_alignment_observed`, `q_handoff_observed`, `q_call_quality` — opener + observed prompts) are parked.

**Still pending (needs Carl's go-ahead — paid):** a live scripted-persona re-run to confirm the briefings now read, before the `--update-baseline`.

## Goal
Carried-forward questions keep their axis signatures, scripted runs score normally, and a session full of signal can no longer ship every axis as "didn't come up".

## Changes
- `src/queue-manager.js` (`reconcileQueue`, ~399-411): move the empty-`axis_effects` drop **after** `ref_alias` resolution — if a carried item omits effects, inherit them from the referenced question with issue `inherited axis_effects from <alias>`. Only truly-new items with no effects still drop. `clampToSignature`'s `EMPTY-SIGNATURE` warning stays as backstop.
- Scripted lane: if a frozen script question lacks `axis_effects`, resolve the signature by alias lookup against the session bank at scoring time (no fixture edits).
- `src/golden-checks.js` + `evals/trust-checks.js`: `runAxisSilenceCheck` — ≥4 substantive scored turns with every axis history empty → **`AXIS_SILENT_SESSION`** (WARN; a genuinely signal-free session is possible, but this pattern is an engine fault until proven otherwise).
- Axes will start accumulating again → golden outputs WILL shift. After Carl ratifies the diffs: the one `--update-baseline` of this project.

## Not in this phase
- Confidence calibration of the reads themselves (Phase 6).

## Done when
- [ ] `npm run gate` diffs reviewed and ratified by the product owner, then baseline updated
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Scripted runs read again** — re-run one June 6/7 scripted persona that previously shipped every axis as "This didn't come up". The new briefing's axes should actually read the session's topic. ❌ Not OK if a session entirely about clarity still says clarity "didn't come up".
2. **Thin runs stay honest** — re-run the Maya stonewall persona (all skips and "fine"). Axes should STILL say not enough signal — the fix must not invent reads from nothing. ❌ Not OK if a silent session suddenly gets confident axis scores.
3. **The paper trail** — ask me to show a turn log with the new `inherited axis_effects from q_…` line, so you can see carried questions keeping their signatures.
4. **Ratify the diffs** — I'll show you the before/after gate diff. You decide the new outputs are right before I update the baseline.
