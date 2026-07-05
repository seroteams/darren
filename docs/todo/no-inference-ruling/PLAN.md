# No-Inference Ruling — spec fix, gates, engagement_read

**Goal:** The "no inferred psychological states" ruling is mechanically enforced — the spec points at real code, three new hard gates catch violations, and `engagement_read` no longer asserts an internal employee state.
**Driver:** Carl
**Created:** 2026-07-05

Source: the approved MoSCoW review of [docs/sero-prompt-improvement-spec.md](../../sero-prompt-improvement-spec.md).
Key finding: the spec's "highest risk" field `disengagementSignal` **doesn't exist** — the live field is
`engagement_read` (`backend/shared/briefing.types.ts:16-22`). The prompts are already mostly compliant;
the real gap is the three unbuilt gates.

## Done means
- The spec names the real field (`engagement_read`) and the real test setup (8 golden cases), so anyone building from it lands on the right code.
- `INFERRED_STATE_LEAK`, `THIN_INPUT_SUPPRESSION`, `EVIDENCE_ANCHOR` run in `evals/trust-checks.ts` and fail the gate on violations.
- `engagement_read` is re-specced: observed shift + what to watch, quoting input or citing an event — never a state label.
- Adversarial golden cases lock it in ("quiet quitting" note, 5-token note, one-word answers).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Fix the spec + docs rule (M1 + S5) | Spec re-aimed at `engagement_read`, test-matrix claim corrected, "never train on manager notes" standing rule | ✅ |
| 2 | The three gates (M3 + M4 + M5) | `INFERRED_STATE_LEAK` / `THIN_INPUT_SUPPRESSION` / `EVIDENCE_ANCHOR` in trust-checks + <15-token rule in all four prompts + source-reference field | ✅ |
| 3 | Re-spec `engagement_read` (M2) | Contract + final-evaluation prompt + downstream renderers; needs one paid gate case (~$0.35, Carl's go) | ✅ |
| 4 | Hardening (S1–S4) | Six rules verbatim in prompts, axis evidence thresholds, adversarial golden cases, `outcomeCheck` field | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 3 ✅ green-lit + committed 2026-07-05 ("A" — confirming paid run PASS, observed_shift now note-anchored,
echo fix live-proven; track spend ~$0.70). Next: Phase 4 (hardening, free) — waits for Carl's go.**
`engagement_read` re-specced (`read_status` + `observed_shift`, state-label enum gone), legacy runs normalised,
renderer handles both shapes, replay baselines re-frozen (7/7 PASS), carve-out removed. Paid case ran (PASS,
~$0.35 — track spend so far ~$0.35) and caught a real rule-echo in `observed_shift`; prompt fixed + a new
`EVIDENCE_ANCHOR` check now hard-fails unanchored shifts. `npm test` **75/75** · typecheck ✓. Uncommitted.
Open question for Carl: one confirming paid re-run (~$0.35) or accept offline proof.
**Phase 2 ✅ green-lit + committed `705926c2` ("GO").** The three gates
live in `evals/trust-checks.ts` (test-first: 16 new unit cases red→green), the <15-token thin-notes rule is in
all four prompts, and `EVIDENCE_ANCHOR` enforces the existing `FocusPoint.source` contract at eval time.
Calibrated against the 7 frozen replay cases — all still pass (`npm run replay` 7/7, $0); full `npm test`
**73/73** + typecheck clean. Uncommitted, waiting for the green light.
**Phase 1 ✅ green-lit + committed `2693dcea` 2026-07-05 ("go please").** A second-AI review of the
plan was vetted same day: its "Engine 2.0 handoff" factual basis doesn't exist in this repo (unverified), but
four logic points were accepted — Phase 2 gains a documented temporary carve-out for `engagement_read.level`
(so the new gate doesn't fail the current system before Phase 3 fixes the field), a precise <15-token
definition, a manager-facing-only rule for input-anchored state words, and the spec gained the axis-vs-label
justification + a future-contract guard. **Baseline (free): `npm test` 69/70** — the one failure is pre-existing
(`backend/engine/scenario-pack.test.ts` imports a `scenario-pack.ts` that doesn't exist on disk; another
session's mid-work, same family as the `@sero/run-debrief` build note in STATUS.md — not this track's fault).
Paid `npm run gate` skipped per cost rule; Phase 1 is docs-only.

## Parked
- **C1 — Routing-nudge engine** (rollover ≥3 / cadence-gap triggers, behavioural reason, one-per-quarter cap, store arc ID not trait). New feature, zero live risk today — nothing exists to mis-fire.
- **C2 — Nudge test fixtures** (spec test assertions 7–8). Only meaningful once C1 exists.
- **C3 — Expand the 8 golden cases toward systematic combo coverage.** The adversarial cases in Phase 4 buy most of the protection first.
- **Won't (keep excluded):** UI/dashboards/trends/exports/cross-employee comparison; probabilistic nudge models; new taxonomy work; cross-session axis storage (none exists — keep it that way).
