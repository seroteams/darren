# Remove the dead mid-run-notes plumbing from the planner

⏸️ **PARKED 2026-08-01 by Carl ("a" = park it).** Nothing has been edited. Blocked only by a
lane clash, not by a decision: at the time of writing, chat `c91a58a9` (coach-hints-live) holds
`backend/engine/queue-manager.ts`, `backend/engine/queue-manager.test.ts` and
`content/prompts/plan-turn.md` in [LANES.md](../../../../LANES.md). **Pick this up the moment that
lane clears.**

## The rule this enforces

A mid-run session note is an **observation ABOUT a run, never an input TO one**. The notes panel is
internal-admin QA tooling. Commit `cba8004e` ("notes are admin-only QA") already unwired notes from
the per-turn planner and the final evaluation, and two live call sites carry a comment saying so:

- [plan-turn-inputs.ts:50](../../../../backend/api/services/sessions/plan-turn-inputs.ts) — "Deliberately NO sessionNotes"
- [session-streams.ts:398](../../../../backend/api/services/sessions/session-streams.ts) — same

**Nothing passes notes to the planner any more.** This job is not a bugfix. It is removing the empty
pipe so nobody re-connects it by accident.

## What is left to remove

### 1. `backend/engine/queue-manager.ts`

| What | Where (as of 2026-08-01) |
|---|---|
| `PlannerSessionNote` in the type import from `./messages.ts` | line 29 |
| `sessionNotes = null` default + `sessionNotes?: PlannerSessionNote[] \| null` in the `planTurn` signature | lines 377, 394 |
| `sessionNotes,` passed into `buildMessages` | line 429 |
| `sessionNotes` passed into `buildGroundingCorpus` | line 475 |
| `buildGroundingCorpus` param, type and the corpus line `...(sessionNotes \|\| []).map((n) => n?.text),` | lines 563, 570, 579 |
| The stale comment above `buildGroundingCorpus` ("Mid-run notes join the corpus when provided (the P4 wire passes them)…") | lines 553-556 |
| `sessionNotes: args.sessionNotes,` in `assemblePlanTurn` | line 622 |

### 2. `content/prompts/plan-turn.md`

Remove the block at lines 430-432:

- the `**Manager's mid-meeting notes (their live observations; …)**` heading
- the `{{SESSION_NOTES}}` placeholder beneath it

### 3. `backend/engine/messages.ts` — **only together with step 2**

| What | Where (as of 2026-08-01) |
|---|---|
| `interface PlannerSessionNote` | lines 37-41 |
| `function renderSessionNotes` and its comment | lines 43-55 |
| `sessionNotes = null` default + `sessionNotes?: PlannerSessionNote[] \| null` in `buildMessages` | lines 72, 88 |
| `.replaceAll("{{SESSION_NOTES}}", renderSessionNotes(sessionNotes))` | line 140 |
| `renderSessionNotes` from the export list; `PlannerSessionNote` from the type export | lines 178, 179 |

> ⚠️ **Order matters.** `fillPlaceholders` leaves unknown keys in place silently, so removing the
> fill while the prompt still holds `{{SESSION_NOTES}}` ships a raw placeholder to the model.
> Land step 2 and step 3 in the same commit, or step 2 first.

### 4. The tests

**`backend/engine/queue-manager.test.ts`** — the case at line 236,
`"buildGroundingCorpus: carries intake context and answers; mid-run notes join only when provided"`.
Drop the `withNotes` half (lines 251-255) and rename the case. **Better: invert it** so it asserts a
note can NEVER reach the corpus. That turns a removal into a guard against re-wiring.

**`backend/engine/messages.test.ts`**

- Drop `"session notes render capped and defaulted, and never enter the cached prefix"` (lines 114-134).
- Drop the `sessionNotes:` line from `"everything per-run constant stays byte-identical across turns (cache prefix)"` (line 100).
- **KEEP** `"untrusted note text cannot smuggle a placeholder into the planner prompt"` (line 139),
  but reduce it to the intake-note half. The intake note (`ctx.notes`) is still a live untrusted path
  and that guard came out of the 2026-07-31 audit. Only the mid-run-note assertions go.

## How to verify (free checks only, no paid runs)

```
npm test
npm run typecheck
npm run lint:copy
node scripts/replay-scenario.js --regression-all --fixtures-only
```

Known pre-existing failures, **not** caused by this work: two prep-validator fixtures
(`good_shape_example`, `may24_good_prep_snapshot`), red since commit `832d63da`.

## Before starting

Re-read [LANES.md](../../../../LANES.md) and confirm `queue-manager.ts`, `queue-manager.test.ts` and
`plan-turn.md` are free. Line numbers above are from 2026-08-01 and will have drifted: grep for
`sessionNotes`, `SESSION_NOTES`, `PlannerSessionNote` and `renderSessionNotes` rather than trusting them.
