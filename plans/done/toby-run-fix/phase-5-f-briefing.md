# Phase 5 — F Briefing Quality

Status: not started  
Owner: heavy-ops  
Scope: F1-F4 only

## Goal

Make final briefing output non-redundant, evidence-based, and action-shaped for manager use.

## Issues

### F1 — Bullets must not paraphrase headline
- Files:
  - `prompts/final-evaluation.md`
  - `src/briefing.js` (validator/warn path)

### F2 — brutal_truth_manager needs concrete next move
- Files:
  - `prompts/final-evaluation.md`
- Rule:
  - Growth meetings must name concrete plan move (scope, project, stakeholder, competency), not vague "dig deeper."

### F3 — Growth brutal truth must include career evidence
- Files:
  - `prompts/final-evaluation.md`
- Rule:
  - Use specific transcript evidence (behavior/artefact/moment), not generic vibes.

### F4 — Add n-gram overlap warning
- Files:
  - `src/briefing.js`
- Rule:
  - Warn if headline and bullet share >= 4-word content overlap.

## Acceptance gate

- Toby rerun: headline and bullets do not restate each other.
- `brutal_truth_manager` contains concrete plan move plus evidence.
- Overlap validator catches synthetic duplicate fixtures.

## Out of scope

- Planner sequencing
- Opener routing
- Lexicon candidate extraction
