# Phase 6 — Import the old runs (Carl chose: all ~250)

**Status:** 🔨 BUILT + LOCAL IMPORT DONE 2026-07-09 ($0) — awaiting Carl's walk; the LIVE
import stays behind his separate explicit go (QA 4)

## Build + local import results (2026-07-09)

[scripts/backfill-runs.ts](../../../scripts/backfill-runs.ts) — walks `logs/<month>/`,
upserts the session row via the live funnel, folds review/rating/archive sidecars into
columns, and imports every other file as a `run_artifacts` row (prompts + raw model
responses stay TEXT so parse failures surface; mapping rules locked by
[test-backfill-mapping.js](../../../scripts/test-backfill-mapping.js)). Idempotent by the
unique keys; deletes nothing; guarded so importing the helpers never runs the import
(the gate.js lesson). Flags as specced (`--dry-run --month --limit --only --questions --stores`).

**The local import ran for real:**
- **100 runs imported** (july 49 · june 49 · may 2) + **1,787 artifact files** — DB now
  holds 2,201 artifacts and 4,912 generated questions.
- **158 dirs skipped** — no `session-state.json` (CLI/smoke lanes; the app never listed
  them either). 100 + 158 + 7 ≈ the "~250" folders.
- **7 runs skipped honestly** — their org row no longer exists in this DB (old demo/test
  orgs); the FK refused them, which is the fence working. Reported, not forced in.
- **Idempotency proven:** second full run → identical counts, zero failures.
- **An imported June run reads through the pg store**: headline, briefing, 9 turns, all
  5 stage tabs.
- Companion passes: `--questions` (4,912 kept, alias conflicts keep existing) ·
  `--stores` (aliases/cap/traces; audit pass correctly refused to append into a
  non-empty `audit_log`; role/arc overlays self-migrate at boot instead).

`npm test` **105/105** · $0. **NOT DONE on purpose:** the LIVE import (QA 4) — runs only
on Carl's separate explicit go, with `ALLOW_ENV_MISMATCH=1` stated first.

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
