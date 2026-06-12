# Jun 11 demo fixes — Machar run

**Goal:** The four live-Q&A trust bugs from the Jun 11 demo can't happen again, the brief reads like it knows the person, the live scores are honest, and the manager can step back to fix an answer.
**Driver:** Carl
**Created:** 2026-06-12

Source: demo run `logs/june/2026_Jun11_08-12-c6dacfe1` (Machar · Partner alliance manager · Lead · Bi-weekly) + Carl's 14 in-run notes. Full diagnosis in the approved plan (`~/.claude/plans/read-this-and-lets-generic-phoenix.md`).

## Done means
- Re-running the Machar inputs produces: no outside-work opener, no duplicate question, no question from another run's bank, no forbidden seed, no debug text in the UI.
- The brief says "Machar", not "a lead partner alliance manager", and contains no jargon ("air cover" etc.).
- Live score bars move every answered turn — or visibly say they didn't.
- A "back" control lets the manager amend the previous answer and the session follows the corrected answer.
- The Machar run is a permanent regression fixture wired into `npm run gate`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Question integrity | Central eligibility gate every question passes before the UI + rejection logging + Machar regression fixture | 🔨 |
| 2 | Brief wording | Name-not-title + plain-language guard (flag-and-retry, never rewrite) | 🔨 |
| 3 | Live scores | Timeboxed diagnosis of stalled score bars; fix or honest "didn't update" indicator | ⬜ |
| 4 | Back navigation | One-step-back to amend the previous answer (spec questions answered before code) | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 built (2026-06-12), awaiting product-owner test. **Baseline:** `npm run gate` = 7/7 ERROR — not a quality signal: every OpenAI call fails with 429 `insufficient_quota` (account out of credit). Live verification (gate, full smoke, Machar re-run) is blocked until the OpenAI quota is restored — needs Carl.

What landed (uncommitted until green light):
- `src/question-eligibility.js` — the central gate (type forbidden patterns + duplicate-text check) + rejection logging (`eligibility-log.json` in each run dir).
- Wired into every path: opener pick, planner new items, coverage insertion, seed overflow (CLI + web), and serve-time checks in both the CLI loop and the web `/api/question` handler (scripted runs: log-only, path stays frozen).
- Bi-weekly `type.js` got `forbidden_question_res` (machine-checkable subset of its anti-patterns).
- Thread-follow: grounds in the answer's words or skips — canned stem removed; real transcript passed; repeat-protected.
- Web plan handler now passes `sessionBank` (the global-bank pollution fix the CLI already had); built in `bank.js`, persisted.
- `QUESTION_INTEGRITY` hard-fail added to trust checks; Machar demo frozen as fixtures (`evals/fixtures/machar-jun11-*`), golden case `machar-biweekly-jun11` registered, scenario at `scenarios/regression/machar-biweekly-jun11.json`.
- `scripts/test-question-integrity.js` (21 checks, incl. negative test: the frozen Jun 11 run trips all four detectors) added to `npm test` — 20/20 suites pass.

Verified offline: `npm test` 20/20 (incl. 23-check question-integrity suite with the frozen Jun 11 negative test); handlers load; lint clean (one pre-existing warning); live wiring check (start → first question on a Machar bi-weekly) served a work-appropriate opener through both gates. An independent adversarial code review (7 angles, 28 candidates) was run over the diff: most candidates refuted against the code; accepted fixes — sessionBank fallback hardened (any supplied array is authoritative, legacy null → seeds-only never global), serve-time gate extracted to one shared `dropIneligibleHeads` helper used by both CLI and web. Known consequences noted in Parked (thread-follow fires rarely by design; stale batch-k-verify flagged as separate task).

Carl delegated the Phase 1 green light to self-verification (2026-06-12: "check first, propose") — committed on that basis; the live QA scenarios still get walked once OpenAI quota is restored, and the phase only goes ✅ after that.

**Phase 2 built same day (lean mode):** name-not-title rule + plain-language guard in `prompts/preparation.md` + `validateBrief()` (name required in coreIssue, jargon backstop via shared `findJargon` in `src/golden-checks.js` — "bandwidth" deliberately excluded because the prep prompt recommends it); jargon line added to `prompts/generate-questions.md` plain-speech lint + drop-and-log backstop in `generateBank` (`dropped_jargon` in the stage log); Jun 11 brief frozen as `evals/fixtures/machar-jun11-brief.json`; `scripts/test-prep-wording.js` (12 checks) in `npm test` (21/21 suites).

**OpenAI quota is working again** (discovered 2026-06-12 when a module load-check accidentally executed a full smoke run — $0.37, 29/29 checks passed, Phase 1+2 behaviour all visible live). Cost correction: a full pipeline run is ~$0.37 (planner stage ×9 on the big model), so the 8-case gate ≈ $3 — run it only with Carl's nod. The Machar regression gate case was run solo (~$0.35): **PASS end-to-end** — brief says "Machar" (not the title), no jargon, clean suggestedAction, 9 distinct questions, QUESTION_INTEGRITY clean. Session OpenAI spend ≈ $0.72.

Next: Carl eyeballs the Phase 2 brief + walks Phase 1 scenarios when convenient → phases go ✅ → full-gate re-baseline (~$3, on Carl's nod) → Phase 3 (live scores, needs the dev server).

## Parked
- Voice/transcript input — typing-while-listening friction ("we're filling in a form almost"). Bigger UX theme, own track.
- Role context for unfamiliar roles — already the role-profiles track (`docs/todo/role-profiles/`); the Machar run predated role-profile wiring, newer runs have it.
- Axis scoring penalises garbled *typing* as low "clarity" — worth a look at whether clarity should judge the report's message, not the manager's typos. Revisit after Phase 4.
- Marketing/content angles from the call (meeting-type content pillars, "types of 1:1s" audience question) — Machar's side, not engine work.
- Thread-follow now fires rarely by design: it grounds in the answer's words or stays silent, and the validator rejects the vague mirror on long (≥8-word) answers — so substantive answers get no injected follow-up (the planner prompt is still told to follow them itself). The deeper fix is a real model-generated follow-up instead of a template stem. Revisit if live runs feel like threads get dropped.
- `forbidden_question_res` exists only on bi-weekly so far — grows per type strictly from observed leaks, never speculatively (the gate mechanism already supports every type).
- `scripts/batch-k-verify.js` has a stale FX-28 check that predates the honest-coverage rewrite (fails on HEAD too) — separate cleanup task flagged.
