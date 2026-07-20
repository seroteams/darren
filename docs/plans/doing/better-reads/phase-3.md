# Phase 3 — Prep freshness

**Status:** ⏳ waiting (behind Phase 2 green light + promises-loop lane on content/prompts/ + session-streams.ts)

## Scope
- New `backend/engine/prep-history.ts` (+test) mirroring `promise-history.ts`: `historyRunMatches` fence (same userId+personId, excludeId, error→null); map `state.preparationResult.brief` → `{when, meetingType, coreIssue, openingQuestion}` — brief fields only, never notes text. File walk + `pgPrepHistory` twin in `backend/db/runs-store.ts`. Arc fence: relational-arc meetings only see prior relational-arc briefs (FOCUS_ARC_LEAK backstop stays).
- `backend/engine/preparation.ts`: optional `prepHistory` → `{{PREP_HISTORY_BLOCK}}`; empty renders "(first prep for this person)"; `assemblePreparation` preview included.
- `content/prompts/preparation.md`: ≤4 rendered lines, **User half only** (System half byte-identical — cache preserved): open new ground, don't repeat or reword the prior opener.
- Wire at `session-streams.ts` preparation produce.

## Verify
Free first: unit tests, typecheck, prep fixture replay (validator still passes with the block).
Then **ONE paid eval ~$0.35** (`node scripts/gate.js --only <prep case>`): repeat bi-weekly, near-identical notes. Pass = coreIssue/openingQuestion materially differ from prior AND `attempts` doesn't worsen (baseline: attempt-1 reject 64/65). Cost stated before running; a 2nd run needs Carl's yes.

## QA scenarios (Carl)
1. Run two bi-weeklies for the same person with similar notes: the second brief opens different ground.
2. First-ever prep for a person: unchanged behaviour, "(first prep)" path.
