# Phase 1 — B Visible Flow UX

Status: done  
Owner: light-ops  
Scope: B2 first, then B1/B3

## Goal

Fix immediate UX friction in questioning flow and axis display without changing planner semantics.

## Issues

### B2 — Axis seed renders neutral (priority first)
- Files:
  - `frontend/client/src/ui/axes.js`
- Change:
  - When `score === seed` and `history.length === 0`, render neutral (no red minus signal).
  - Switch to colored delta view only after first real movement.

### B1 — Auto-skip question bank gate
- Files:
  - `frontend/client/src/stages/bank.js`
  - `frontend/client/src/state.js`
- Change:
  - On bank ready event, auto-advance to questioning.
  - Keep loading/orb feedback; remove extra CTA stop.

### B3 — Axis baseline tooltip
- Files:
  - `frontend/client/src/ui/axes.js`
- Change:
  - Tooltip: "Seeded at <N>. Moves with answers."

## Acceptance gate

- Fresh run shows neutral wellbeing/engagement chips at seed.
- No forced click on "Question bank / Start the 1:1" gate.
- Axis chip tooltip shows baseline explanation.

## Out of scope

- Prompt wording changes
- Planner queue logic
- Lexicon extraction
