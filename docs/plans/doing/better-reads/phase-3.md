# Phase 3 — Prep freshness

**Status:** 🧪 built 2026-07-20, awaiting Carl's QA (evidence below)

## Built + proven (2026-07-20)
Free half: `prep-history.ts` fence (userId+personId via historyRunMatches, arc fence, brief fields only) + `pgPrepHistory` twin + threading through `buildPrepInput`→`buildMessages`. Finish: `{{PREP_HISTORY_BLOCK}}` + 2 instruction lines in preparation.md's **User half** (System half byte-identical — cache preserved, unit-tested), wired at `preparationStream` via `prepHistoryFor`. Preview endpoint stays sync → renders the first-prep sentinel (same accepted drift as the focus-points preview).

**Paid proof (3 gpt-5.4 prep calls ≈ $0.13, under the $0.35 Carl approved):**
| Run | Opener overlap vs prior | Read |
|---|---|---|
| No history (baseline) | — | attempts 2 (= the known 64/65 validator baseline) |
| With scripted prior | 0.20 | differs from prior; attempts unchanged |
| **With its OWN previous brief as prior** | **0.08 opener / 0.27 core-issue** | opener genuinely new; core issue names the theme as *continuing* ("caught in a continuing review loop") instead of rediscovering it — exactly the instructed behaviour |

Not worsened: attempts stayed 2 (the pre-existing validator-strictness retry — that fix is the parked Q1 cost quick-win, not this phase).

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
