# Phase 3 — D Conversation Architecture (Planner)

Status: done  
Owner: heavy-ops  
Depends on: Phase 2 fixture (C7)  
Scope: D1-D6 only

## Goal

Keep the conversation moving across arc stages, prevent clarifier loops, and preserve budget for commitment questions.

## Issues

### D1 — Track remaining arc stages explicitly
- Files:
  - `src/queue-manager.js`
  - `prompts/plan-turn.md`

### D2 — Arc-stage budget rule
- Files:
  - `prompts/plan-turn.md`
- Rule:
  - If `turns_remaining <= remaining_stages.length`, prioritize next unserved stage over clarifier.

### D3 — Snap-back after strong growth/clarity signal
- Files:
  - `prompts/plan-turn.md`
- Rule:
  - If last realized deltas show growth `>= +1` or clarity `>= +1`, stop wellbeing clarifier chain and progress arc.

### D4 — Cap repeated wellbeing clarifiers
- Files:
  - `prompts/plan-turn.md`
- Rule:
  - Max 2 consecutive wellbeing clarifiers.

### D5 — Cap off-arc tangent drills
- Files:
  - `prompts/plan-turn.md`
- Rule:
  - Max 1 off-arc follow-up unless explicit manager deepen hint exists.

### D6 — Replay turn-sequence validation
- Files:
  - `scripts/replay-scenario.js`
- Check:
  - Replay Toby answers and assert arc coverage (anchor -> aspiration -> gap -> investment -> commitment).

## Acceptance gate

- Replay includes at least one question from each arc stage.
- No 3-turn wellbeing clarifier chain.
- No budget starvation before commitment stage.

## Out of scope

- Opener bank data updates
- Briefing prompt changes
- Lexicon extraction/floor policy
