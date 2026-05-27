# Phase 7 — Full Replay and Verification

Status: not started  
Owner: mixed  
Scope: verification only

## Goal

Run integrated replay checks after Phases 0-6 land, and prevent regressions on known weak dimensions.

## Steps

1. Replay Toby scenario end-to-end:
   - `node scripts/replay-scenario.js toby_growth_lead`
2. Run May 24 batch regression sweep:
   - `logs/may/2026_May24_batch`
   - compare against `quality_report.json` dimensions
3. Confirm phase-level acceptance gates remain satisfied.

## Acceptance gate

- Toby replay passes all declared assertions for C/D/F/G phases.
- Batch sweep does not regress known weak dimensions targeted by this plan.
- Any failures are logged as explicit follow-up items (not silent).

## Out of scope

- New feature work
- Prompt redesign beyond existing acceptance criteria
