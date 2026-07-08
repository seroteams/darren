# Phase 2 — Write path: every new run saves to the DB too (dual-write)

**Status:** 🔨 BUILT 2026-07-08 — awaiting Carl's QA walk

## Build results (2026-07-08)

Dual-write is live behind the existing funnel. Proven **free** (no OpenAI) with a throwaway
script that ran the real `createSession` + `logStage` + `upsertSession`, flushed, and read the
rows back from Neon:
- **Session row** carried every denormalized column (personName "Priya", role, meetingType,
  mode, personaId, runLabel, finished, lastSeenAt) — listings won't need a jsonb scan.
- **All 7 stage artifacts** landed: `01-focus-points/{inputs.json,prompt.md,response.json}` +
  `05-evaluation/{inputs.json,prompt.md,response.json,final.json}`.
- Rows cleaned up after; echo dir removed.
- Checks: `npm test` **88/88** (new `run-artifacts-store.test.ts`) · typecheck clean · **$0**.

### What Phase 2 captures
- The **session row**: full `state` jsonb **plus** the denormalized index columns
  (`db/sessions-store.ts indexColumns`). `state` already carries transcript, axis-state,
  turnSnapshots and notes — so those ride along for free.
- The **pipeline stage artifacts** via the `logStage` funnel (all lanes: web, persona, CLI):
  focus-points, role-profile, preparation, question-bank, evaluation → inputs/prompt/response/final.
- `feedback.json`.
- **Dev file-echo** (`RUN_FILE_ECHO`, on locally / off in live) keeps disk copies for tooling
  and is the rollback; `createSession` no longer creates empty dirs when echo is off.
- `flushArtifactWrites()` wired into CLI exit + server shutdown so short processes don't drop writes.

### Deliberately deferred (honest scope cut)
- **Per-turn dynamic-answer files** (`04-dynamic-answers/NN-prompt.md`/`NN-response.json`) and
  `cost.json` — written outside `logStage` (in `session-streams.ts`, `persona-runs.runner.ts`,
  `cli/stages/questioning.ts`). Folded into **Phase 3**, where those reads move to the DB (capturing
  them here would be write-only until then). The turn *content* is already in `state.transcript`.
- **Append-sidecars** (eligibility-log, amend-log, notes.md, lexicon-decisions.jsonl,
  script-coverage) → **Phase 5** (small stores) — they're per-run log-only diagnostics.
- `feedback.json` append correctness under echo-OFF (reads the disk array today) → noted for **Phase 7**.

### Design note
The `run_artifacts → sessions` foreign key was **dropped** (migration 0011): artifacts are written
from every lane including the pure-terminal CLI, which builds no session row, so requiring the parent
row first would make writes order-dependent and fragile. The unique `(session_key, stage, name)`
index still keys upserts; Phase 7 deletes artifacts explicitly instead of via cascade.

---

## Original scope (as planned)

## Why this phase

Start filling the database while disk stays untouched and canonical — if anything's wrong we lose
nothing. Also closes today's hole where the CLI lane bypasses the DB mirror entirely (the
`pgSessionsRepo` mirror only covers the web lane).

## What gets built

1. **New `backend/db/run-artifacts-store.ts`** (pattern-clone of `db/sessions-store.ts`):
   - `queueArtifact(runId, orgId, {stage, name, kind, content})` — sync facade; internally a
     per-run promise chain (`Map<runId, Promise>`) so one run's writes stay ordered; failures
     `console.warn` and never break a turn.
   - `readArtifact(sessionKey, stage, name)` / `listArtifacts(sessionKey)` — async (for Phase 3).
   - `flushArtifactWrites()` — awaited at CLI exit and server shutdown.
   - `shouldEchoToDisk()` — `RUN_FILE_ECHO` env flag; default ON when `APP_ENV=local`/unset,
     OFF when `live`.
2. **Route the existing write funnel through it** (signatures unchanged — web, persona AND CLI
   lanes converge automatically):
   - `backend/engine/session.ts` `logStage` / `logFeedback` → disk iff echo; always queue to DB.
   - `backend/api/session-persistence.ts` `persist` → echo-guarded file write; `upsertSession`
     MOVES here from `pgSessionsRepo` so every persist path (web, persona, CLI) hits the DB.
   - Sidecar helpers in `backend/api/services/sessions/sessions.repo.ts` (eligibility log,
     script coverage, amend log, notes, lexicon decisions) → through the store.
   - Transcript/axis/turn writers (`session-streams.ts`, `persona-runs.runner.ts`,
     `cli/stages/questioning.ts`) already call the funnel functions — no lane-specific changes.
3. **Denormalized `sessions` columns** populated in `db/sessions-store.ts upsertSession`
   (userId, personId, meetingType, finished, lastSeenAt, …).
4. **Flush hooks:** `backend/cli.ts` awaits `flushArtifactWrites()` before exit; server shutdown too.

Disk writes are UNCHANGED this phase (echo on everywhere) — dual-write only.

## Files

new `backend/db/run-artifacts-store.ts` (+ mirrored test) · `backend/engine/session.ts` ·
`backend/api/session-persistence.ts` · `backend/api/services/sessions/sessions.repo.ts` ·
`backend/db/sessions-store.ts` · `backend/cli.ts` · `backend/api/server.ts` (shutdown hook).

## Tests (written first)

- Queue ordering: two writes to the same run land in order; writes to different runs interleave.
- Failure isolation: a rejected DB write warns and does not throw into the caller.
- Flush: pending writes complete before `flushArtifactWrites()` resolves.
- Denormalized columns match `serialize()` fields for a fixture session.
- CLI flush: spawn the CLI on a fixtures-only path and assert rows exist after exit (integration,
  skips without test DATABASE_URL).

## QA scenarios (Carl)

1. Run a full 1:1 in the admin UI — everything looks and feels identical (files still written).
2. I show you the run + its artifacts sitting in the DB (superadmin peek / query output).
3. One CLI run locally — its run also lands in the DB (the old bypass is closed).
4. Turn speed feels unchanged (I'll also compare timings).
5. One small paid gate case (~$0.35) passes.

## Rollback

Disk is still canonical — revert the commit (or flip the dual-write off); nothing depends on the
DB rows yet.

## Risks

- Per-turn latency → mitigated by the queue (never awaited on the request path); timing check in QA.
- CLI exiting before the queue drains → flush hook + the spawn test above.
