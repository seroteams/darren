# Phase 4 — Questions: the invented-question pool moves to the DB

**Status:** ✅ GREEN-LIT 2026-07-09 — Carl: "A" (close, walk waived — his explicit call; the
free proofs below stood in: DB-mode replay landed real rows, dedup verified, 102/102). The one
paid gate case (~$0.35) was NOT run — it can ride on any future paid run if wanted.

## ✅ GREEN-LIT 2026-07-09

## Build results (2026-07-09)

- **New [backend/db/questions-store.ts](../../../backend/db/questions-store.ts)** — the
  boot-hydrated cache + queued `UNIQUE(alias)` / `onConflictDoNothing` upserts. Engine
  call sites stay synchronous and unchanged; reading unhydrated in a DB-backed process
  is a **loud error** (never a silent empty pool). Alias set = DB aliases (pool AND
  `_runtime`) ∪ every disk alias (seed/intro/openers/echoes) — a superset only makes
  dedup more conservative.
- **[questions.ts](../../../backend/engine/questions.ts)** branches on `hasDatabaseUrl()`:
  `saveQuestion` = cache + queue + YAML echo (echo-gated; `_index.json` maintenance is
  file-mode-only — **rollback note:** run `scripts/rebuild-question-index.js` before
  flipping reads back to files) · `loadDir("")` + `listAllAliases` + `loadQuestion` root
  reads answer from the cache · static `_seed`/`_intro`/`_openers.json` stay git files.
- **Boot hooks:** server `main()` (after the env guard), CLI `main()` — the smoke/gate
  lane spawns the CLI, so it inherits hydration. Flush hooks beside the artifact flush
  (CLI exit + server shutdown).
- **Proven free, end-to-end:** a cassette replay in DB mode ($0, real engine) landed
  **10 pool questions + 36 `_runtime` run records** in `generated_questions`, with fresh
  alias suffixes proving dedup consulted the full alias universe. `npm test` **102/102**
  (5 new store tests) · typecheck clean · file-mode replay PASS (unchanged behavior).

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
