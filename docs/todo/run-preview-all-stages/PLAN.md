# See what's sent to the AI, before it's sent — for every step

**Goal:** The "Sent" tab on the Run panel shows the exact about-to-send text, before the call, for all five AI steps — not just Preparation.
**Driver:** Carl
**Created:** 2026-07-05

## Done means
- Start a real 1:1, open **Run panel → Sent**, and at each step you see *"Not sent yet — the exact text we'll send…"* **before** that step runs.
- Works for all five steps: Focus points · Preparation (already done) · Question bank · each Q&A turn · Final briefing.
- Costs nothing — previews never call the AI. The cost log stays flat.

## Background
The feature already exists but was wired for only 1 of 5 steps (Preparation). The code
said *"Preparation only for now; others follow."* This finishes it by copying the proven
Preparation pattern (an engine `assembleX` + a Session→inputs builder + one registry line)
for the other four steps. The UI needs no changes.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Focus points | Before-send preview for the focus-points step | ✅ |
| 2 | Question bank | Before-send preview for the question-bank step | ✅ |
| 3 | Final briefing | Before-send preview for the evaluation/briefing step | 🔨 |
| 4 | Questioning (per-turn planner) | Before-send preview for the next question, when an answer is pending | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Baseline (2026-07-05):** `npm test` 69/69 pass · `npm run typecheck` clean. Free — no API.
**Phase 1 — Focus points: ✅ DONE.** Carl green-lit 2026-07-05; committed. Added
`assembleFocusPoints` to `backend/engine/generate.ts` + registered `FOCUS_POINTS` in
`PREVIEW_ASSEMBLERS` (`sessions.service.ts`), with a service test proving real assembly at
zero API cost.
**Phase 2 — Question bank: ✅ DONE.** Carl green-lit 2026-07-05; committed. `assembleBank`
in `backend/engine/question-generator.ts` + `bank-inputs.ts` (mirrors the live bank stream)
+ `BANK` in `PREVIEW_ASSEMBLERS`, with happy-path + 409 tests.
**Phase 3 — Final briefing: 🔨 building now.**

## Parked
- Making the panel more prominent / friendlier wording (Carl chose "all 5 steps", not the polish option).
- Sharing one `buildEvaluationInputs` between the preview and the live eval stream so they can't drift (Phase 3 follow-up).
