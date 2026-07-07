# Briefing grounding fixes

**Goal:** Stop the manager briefing from over-claiming and mis-attributing — scores stop maxing out off one repeated point, manager notes stop being quoted as the employee's words, banned wording is blocked, and one-topic briefings stay short.
**Driver:** Carl
**Created:** 2026-06-19

## Done means
- On the Maya run (`2026_Jun17_09-50-a38874f5`), clarity no longer floors at −9/−10 off one theme — it lands mid-range with the same transcript.
- No briefing field contains banned jargon (e.g. "review churn") or coercive wording ("forcing her").
- Confidence reads ≤ "medium" when a negative score rests on a single repeated point.
- No briefing quotes manager shorthand (`said "…→…"`) as the employee's own words.
- A single-theme briefing is ~30–40% shorter, with no signal lost.
- What already works does NOT regress: the no-signal axis path (wellbeing/engagement "not enough signal"), the skip/read-quality gate, and the prep + focus-points stages.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Dampen repeated-fact deltas | One theme can't ratchet an axis to the floor | ✅ |
| 2 | Code guards in post-processor | Jargon linter + concentration→confidence cap (enforced in code) | ⬜ |
| 3 | Attribution anti-example | Briefing stops quoting manager notes as the employee's words | ⬜ |
| 4 | Single-theme shrink rule | One-topic briefings get shorter, not repetitive | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ ticked 2026-07-01 (QA-pile clear-out).** Correction: the "not committed yet" note below was
**stale** — the damper is committed. After the repo-tidy Phase-2a split it lives in
`backend/engine/delta-gates.ts` (`applyRecurringGapClarityDamper`), imported + called from `queue-manager.ts`.
Verified free (no API): `node scripts/test-recurring-gap-damper.js` → **PASS**; `node
scripts/verify-maya-jun17-damper.js` → **PASS** (clarity **−9 without the fix → −5 with it**, mid-range,
off the floor — exactly the done-when). Phases 2–4 remain not started (parked).

<details><summary>Original Phase-1 build note (paths pre-date the TS/reorg + split)</summary>

**Phase 1 built — awaiting Carl's green light (not committed yet).**
- Baseline (free): `npm test` → 30/30 passing before any change.
- Root cause found: `src/queue-manager.js` already had `applyRecurringGapClarityDamper`, but it only fired when `lastQuestion.purpose === "competency"`. This run's scripted questions carry `purpose: "scripted"`, so the damper never ran and clarity stacked to the −10 floor (ended −9).
- Fix: added a **theme-recurrence** trigger (content-word overlap between the current note and prior negative-clarity notes) alongside the existing competency path. When the same point is re-scored across turns, 2nd+ clarity hits cap at −1; a genuinely new clarity issue still scores full weight.
- Files: `src/queue-manager.js` (damper + helpers, pass `lastAnswer`); tests added to `scripts/test-recurring-gap-damper.js`; new offline proof `scripts/verify-maya-jun17-damper.js`.
- Result: on the real Maya turns, clarity **−9 → −5**. `npm test` → 30/30; competency sim (`verify-maya-live-manual.js`) still −7; QA contract checks pass.
- Scope note: Phase 1 damps **clarity** (the axis that floored). Growth ended −5 (never floored) — left as-is; can extend later if wanted (parkable).
- **Next:** Carl walks the phase-1 test scenarios. Green light → commit (local) → start Phase 2.

</details>

## Parked (expert follow-ons — separate, after the patch lands)
- **P5 — Distinct-evidence as a first-class number.** Compute distinct themes per axis once; confidence, score ceiling, and briefing length all derive from it (replaces the 4 separate rules). High value.
- **P6 — Tag note source at capture** (`report_verbatim` / `manager_inference` / `sero_suggested`) so attribution mistakes become structurally impossible, not prompt-policed.
- **P7 — Adversarial fixture set** (a skip, a one-word answer, a contradiction, a tangent) so clean scripted runs can't hide engine bugs. (Test-input realism, original concern #1, lives here.)
- **P8 — Axis-mapping review:** a craft/quality gap is currently scored as "clarity" (priorities). Validate the mapping across several runs before tuning numbers.
