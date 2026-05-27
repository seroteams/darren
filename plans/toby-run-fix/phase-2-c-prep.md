# Phase 2 — C Prep Quality

Status: done  
Owner: heavy-ops  
Scope: C1-C7 only

## Goal

Improve prep quality so opening and guidance feel actionable, non-accusatory, and role-aware.

## Issues

### C1 — Non-Accusatory Opening Rule
- Files:
  - `prompts/preparation.md`
- Rule:
  - `openingQuestion` may target manager concern (including competency/growth concern).
  - It must not sound accusatory, diagnostic, or like performance judgement.
  - For Growth & career plan:
    - Future-facing, aspirational, developmental
    - May reference growth area indirectly
    - Must not name weakness as fixed flaw
    - Must not reuse focus-point label verbatim
- Examples:
  - Bad: "What communication challenges have you faced recently?"
  - Better: "What kind of communication moments would you like to handle with more confidence as you move toward lead-level work?"

### C2 — Private Concern Reframe Rule
- Files:
  - `prompts/preparation.md`
- Rule:
  - Manager private/blunt concern is valid internal signal for prep.
  - Raw concern wording must not be copied into `openingQuestion`.
  - Reframe into coaching language (growth/support/reflection/future readiness).
- Allowed:
  - concern informs direction
  - question framed as growth/support/reflection
- Not allowed:
  - exposing private concern directly
  - accusing employee
  - hidden manager-judgement tone
  - treating concern as proven fact
- Example:
  - Private concern: "Toby may not be ready for lead because communication is weak."
  - Bad: "Where has your communication fallen short recently?"
  - Better: "As you think about moving toward lead-level work, where would stronger communication make the biggest difference?"

### C3 — listenFor must use behavioral tells
- Files:
  - `prompts/preparation.md`
  - `src/preparation.js` (validator)

### C4 — goodOutcome must be level-specific
- Files:
  - `prompts/preparation.md`
  - `src/preparation.js` (validator)

### C5 — suggestedAction must be pre/in-meeting (not post)
- Files:
  - `prompts/preparation.md`
  - `src/preparation.js` (validator)

### C6 — Validator checks (warnings only)
- Files:
  - `src/preparation.js`
- Rule:
  - Enforce C1-C5 checks.
  - Report via `issues[]`.
  - Do not hard-block generation.

### C7 — Toby regression fixture
- Files:
  - `scenarios/regression/toby_growth_lead.json`
  - `scripts/replay-scenario.js`

## Acceptance gate

- Toby prep opener matches C1/C2 constraints.
- `listenFor` items are behavioral, not generic concern paraphrases.
- `goodOutcome` references role/seniority progression shape.
- `suggestedAction` is pre-meeting or in-meeting, not "follow-up next month".
- Validator emits warnings for violations, does not block.

## Out of scope

- Planner arc logic (D-series)
- Opener bank routing (E-series)
- Briefing changes (F-series)
