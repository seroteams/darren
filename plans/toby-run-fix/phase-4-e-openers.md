# Phase 4 — E Opener Bank and Clarifier Shape

Status: not started  
Owner: mixed  
Scope: E1-E4 only

## Goal

Remove creepy/ill-fitting growth opener behavior and constrain planner-added clarifier length.

## Issues

### E1 — Remove "most like yourself" from Growth meetings
- Files:
  - `questions/_openers.json`
  - `src/opener.js` (verification)

### E2 — Add Growth-native opener
- Files:
  - `questions/_openers.json`
- Candidate:
  - alias: `q_open_growth_lookforward`
  - text: "Before we get into specifics, what's been most on your mind about where you're heading?"
  - meeting_types: `["growth"]`

### E3 — Opener routing regression test
- Files:
  - `tests/opener-routing.test.js`

### E4 — Planner-added clarifier length cap
- Files:
  - `prompts/plan-turn.md`
- Rule:
  - planner-added `name` <= 18 words
  - avoid comma-conjunction sprawl ("and where", "or what")

## Acceptance gate

- Growth meeting opener sampling never picks creepy opener.
- New growth opener appears at non-zero selection rate.
- Routing tests prevent forbidden opener regressions.
- Planner-added clarifiers mostly stay concise (target >95% under cap in synthetic sample).

## Out of scope

- Full planner arc redesign
- Briefing language rules
- Lexicon extraction rules
