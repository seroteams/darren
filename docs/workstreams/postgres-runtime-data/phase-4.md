# Phase 4 — Questions: the invented-question pool moves to the DB

**Status:** ⬜ not started (blocked by Phase 3 green light)

## Why this phase

The engine invents questions during runs — 4,400+ generated YAMLs drive **de-duplication**
("never ask the same question twice" via `_index.json` aliases). It's a separate system from run
storage with its own failure mode (duplicate or missing questions), so it gets its own phase + QA.

## What gets built

1. **`generated_questions` store + boot-hydrated cache** (new `backend/db/questions-store.ts` +
   a thin cache in `backend/engine/questions.ts`):
   - `hydrateQuestionCache()` awaited at server boot, CLI start, and the persona lane —
     loads subdir `''` docs + ALL aliases (DB ∪ static file aliases from `_seed`/`_intro`/
     `_openers.json`) into an in-memory Map/Set.
   - Engine call sites stay **synchronous and unchanged**: `saveQuestion` = cache insert +
     queued DB upsert (same queue discipline as the artifact store) + file echo;
     `listAllAliases` = cache; `loadDir("")` = cache values.
2. **`_runtime` records** (`thread-follow.ts`, `reconcile-queue.ts`) → rows with
   `subdir='_runtime'`, NOT hydrated into the selection cache — mirrors today's scan exclusion
   (`questions.ts:176`; they're write-only run records).
3. **Dedup gate:** `UNIQUE(alias)` + `onConflictDoNothing` in the queue. `newAlias` already
   consults the alias set, so collisions only occur across concurrent processes — keep first, warn.
4. `_index.json` maintenance becomes file-mode-only (DB mode ignores it).
   Static `_seed` / `_intro` / `_openers.json` / `_archive` stay git files, read as today.

## Files

new `backend/db/questions-store.ts` (+ mirrored test) · `backend/engine/questions.ts` ·
`backend/engine/question-generator.ts` (no signature changes) · boot hooks in
`backend/api/server.ts` + `backend/cli.ts`.

## Tests (written first)

- Cache dedup semantics identical to file mode (same alias in → one question kept).
- `_runtime` rows never appear in the selection cache.
- Hydration includes static file aliases (seed/intro/openers).
- Boot-order: engine question calls before hydration fail loudly (or hydrate lazily) — no
  silent empty pool.

## QA scenarios (Carl)

1. Run a 1:1 that generates questions — rows appear in `generated_questions`.
2. Run two 1:1s back-to-back with similar notes — no duplicate questions offered
   (dedup behavior identical to before).
3. `node scripts/replay-scenario.js <id> --fixtures-only` clean (free).
4. One small paid gate case (~$0.35) passes.

## Rollback

Echo keeps the YAML files written; flip question reads back to file mode.

## Risks

- A lane (CLI/persona) missing hydration → boot-order test above.
- `rebuild-question-index.js --prune` touching `_runtime` (pre-existing quirk) — marked
  file-mode-only in Phase 7.
