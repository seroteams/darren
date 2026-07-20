# Arc evidence fixes — land the research report's "ship now" list

**Goal:** The five 1:1 arcs enforce, in code, what the evidence review said they should: task-directed
performance feedback, no diagnosis language in relational meetings, no promotion promises in growth
conversations, no assessment language in onboarding.
**Driver:** Carl
**Created:** Sun 20 Jul 2026
**Board:** https://claude.ai/code/artifact/e310f3ca-a6d5-421b-b350-dd6b1a11854b
**Source:** [docs/research/compass_artifact_wf-1b5cfffb-c57a-5818-92af-102c7f81742b_text_markdown.md](../../../research/compass_artifact_wf-1b5cfffb-c57a-5818-92af-102c7f81742b_text_markdown.md)
(evidence review of all 5 arcs; verdict: 4/5 well-aligned, Performance tone off-evidence, 1-2-2-1 shape fine)

## Done means
- Every meeting type carries a machine-checkable `forbidden_question_res` gate mirroring its
  evidence-critical anti-patterns (today only Bi-weekly has one).
- Performance's tone reads "direct, task-directed, non-personal" — not "no cushioning".
- The offline integrity script proves each gate accepts normal questions and rejects the banned shapes.
- No legitimate fixture question is eaten (eligibility log clean on replay).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Stage-1 gates + tone relabel | 4 new per-type gates, bi-weekly extension, tone fix, tests | ✅ green-lit 2026-07-20 (evidence-first) |
| 2 | Question-count trims + length gating | Cause 2→1 (8→7), Anchor 2→1 (9→8); Growth badge 30-45→35-50 min; budget flows CLI + web via arcBudget | ✅ green-lit 2026-07-20 (evidence-first + badge bump) |
| 3 | Reframes | Self-read intent → "their view, not the verdict"; feels-off "Underneath" intent → opt-in, employee-led (id kept — shared stage across ~200 Qs) | ✅ green-lit 2026-07-20 (evidence-first) |

⬜ not started · 🔨 in progress · ✅ done + Carl green-lit

## ✅ Current state — ALL PHASES DONE (green-lit 2026-07-20)
- **P2:** Performance arc → 7 Qs (Cause 2→1), Growth → 8 Qs (Anchor 2→1); budget flows through CLI + web via `arcBudget()`. Growth picker badge bumped 30-45 → 35-50 min (Carl's call).
- **P3:** Self-read intent = "their view, not the verdict"; feels-off "Underneath" intent = opt-in, employee-led — `id` kept (shared `stage: underneath` across ~200 question files, so intent sharpened, not renamed).
- **Tested:** `npm run typecheck` clean, `npm test` 164/164. Badge verified via live `/api/v1/meeting-types` (Growth "35 to 50 min") + picker template `intake.js:407` passing `t.duration` straight through; pixel screenshot blocked by the animated pulse dashboard wedging the Browser pane.
- **Not pushed** — ships on the next "go live".

## Why Phase 1 is safe
- Gate mechanism exists (`backend/engine/question-eligibility.ts`): a matching question is silently
  dropped, next queued question serves; log-only (`eligibility-log.json`), never user-facing.
- Overlay-safe: manager arc edits can't remove gates (`arc-overlay.ts` carries only arc/tone/anti_patterns).
- Eval layer inherits automatically (`evals/trust-checks.ts` re-uses `forbiddenPatternsFor`).
- Whole-arc scoping only (no phase-scoped gates) — accepted simplification for the Growth promise gate.

## Parked / orphans (behind other live lanes — do NOT edit through)
- `content/prompts/plan-turn.md:191` still says "performance = direct, no softening" — should become
  "task-directed, never person-directed". content/prompts/ is claimed by lane 1b4b459f.
- `scripts/gallery/fixtures/arcs.json` carries the OLD performance tone string (stale static fixture,
  display-only). scripts/gallery/ is claimed by lane 2ee8127c.
Sync both one-liners when those lanes clear.
