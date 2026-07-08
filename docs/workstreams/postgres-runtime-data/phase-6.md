# Phase 6 — Import the old runs (Carl chose: all ~250)

**Status:** ⬜ not started (blocked by Phase 5 green light) · **SKIPPABLE by design**

## Why this phase (and why this late)

Carl's call (2026-07-08): keep the full history — all ~250 runs (~206 MB) go into the DB so the
Library is complete in both environments. It sits late because the import needs the final shelves
(Phase 1) and the proven read path (Phase 3) to import INTO — and being last-but-one makes it
purely additive: if it misbehaves, we drop it without touching anything else.

## What gets built

**`scripts/backfill-runs.ts`** (tsx; guards on `hasDatabaseUrl()`; honors the env guard — the
`ALLOW_ENV_MISMATCH=1` escape hatch exists for exactly this script when Carl intentionally
imports into the live DB):

1. Walk `logs/<month>/<run-id>/` exactly like `walkRuns` (skip `probes`, `gate`, `sweeps`,
   `benchmark`).
2. Dirs WITHOUT `session-state.json` → count + report + skip (they're invisible to the app today too).
3. Per run: upsert the `sessions` row from state (all denormalized columns), then upsert every
   artifact file (filename → kind map; stage dirs → `stage` column; per-turn files keep their
   names under `04-dynamic-answers`); fold `review.json` / `rating.json` / `archive.json` into
   the columns.
4. **Idempotent** by the unique keys (`session_key`, `(session_key, stage, name)`) — safe to re-run.
5. Flags: `--dry-run` (report only) · `--month=<name>` · `--limit=<n>` · `--only=<run-id>`.
6. Companion passes:
   - `--questions` → import `content/questions/*.yaml` (root generated) + `_runtime/` into
     `generated_questions` (alias conflicts: keep existing, report).
   - `--stores` → role-profiles, arc-overlays, people-aliases, guest-cap, audit jsonl →
     `audit_log`, `_suggested` lexicon traces; people profiles imported or rebuilt via
     `rebuild-profiles`.
7. Summary report: imported / skipped / orphan dirs / conflicts, per month.

## Files

new `scripts/backfill-runs.ts` (+ unit tests on the pure mapping helpers).

## QA scenarios (Carl)

1. `--dry-run` first: the report counts ≈250 runs and lists what it would skip — numbers make sense.
2. Real run (local DB first): a well-known old run opens correctly in the Library — briefing,
   stage tabs, review marks and star rating all intact.
3. Run the script a second time — "0 changes" (idempotent proof).
4. Your go, separately, for the LIVE import (the one time `ALLOW_ENV_MISMATCH` is used deliberately).

## Rollback

The script deletes nothing on disk. DB rows can be purged by month if needed.

## Risks

- Very old runs with odd shapes → per-run try/catch, skip + report rather than abort.
- Import volume (~206 MB) → batched inserts; minutes, not hours.
