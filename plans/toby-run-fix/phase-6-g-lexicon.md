# Phase 6 — G Lexicon Extraction

Status: not started  
Owner: heavy-ops  
Scope: G1-G5 only (diagnose first, then fix)

## Goal

Fix zero-candidate behavior on rich transcripts without introducing junk filler candidates.

## Issues

### G1 — Diagnose prompt speaker-source assumptions (read-only)
- Files:
  - `prompts/review-session-for-lexicon.md`

### G2 — Diagnose parser/filter drop-off (read-only)
- Files:
  - `src/lexicon-reviewer.js` (or split equivalent modules)

### G3 — Implement fix from diagnosis
- Files:
  - TBD from G1/G2

### G4 — Lexicon Candidate Floor Rule (v5 softened)
- Files:
  - `prompts/review-session-for-lexicon.md`
- Rule:
  - Do not force weak candidates.
  - When strong phrases about promotion/lead/growth/stretch/readiness/next-level/flight-risk/role-transition exist:
    - surface up to 3 strong candidates
    - prefer fewer high-quality candidates over filler
    - if fewer than 3 strong candidates exist, return fewer
    - never invent weak phrases to satisfy a numeric floor

### G5 — Lexicon regression fixture
- Files:
  - `scenarios/regression/toby_growth_lead.json`
  - `scripts/replay-scenario.js`

## Acceptance gate

- Toby growth transcript returns useful candidates when real phrases exist.
- Zero candidates allowed only when `shouldReview` is false or no strong candidates exist after G3 fix.
- Sparse transcript fixture returns zero (no padding).
- No junk/filler candidates added to satisfy count.

## Out of scope

- Lexicon UI redesign
- Broad wording taxonomy redesign
