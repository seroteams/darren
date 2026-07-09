# Phase 7 — Retire the files

**Status:** 🔨 BUILT (behavior core) 2026-07-09 ($0, test-first) — awaiting Carl's walk. A full
live 1:1 now writes ZERO new app-data files. The frozen tooling-script rewrites (purge-runs /
seed-runs / backfill-people) remain — they're not in the live path and don't affect that goal.

## Built 2026-07-09 (behavior core — test-first, $0)

The plan's one-liner ("echo off in live → verify zero files") hid that several disk writers were
still unconditional. Audited every run-dir writer and echo-gated them; earlier phases had already
done the rest:

- **Already done by earlier phases:** echo is off in live (render.yaml `APP_ENV=live` →
  `shouldEchoToDisk()` false); per-turn artifacts + transcript/axis/cost echo-gated (P3);
  question YAMLs + `_index.json` upkeep DB-mode-gated (P4). No change needed.
- **`persist()` echo-gated** (`session-persistence.ts`) — the every-turn `session-state.json`
  writer skipped in live; DB (`upsertSession`) stays the store. This was the big leak.
- **Five log-only run-dir writers echo-gated** (`sessions.repo.ts` — eligibility log, script
  coverage, amend log, notes render, lexicon-decisions trace) via a shared `skipDiskLog()`; the
  data is in the DB or is dev-only diagnostics.
- **Disk-first fallbacks removed in DB mode** (`sessions.ts`) — `getSession` miss no longer reads
  disk (the boot `loadSessionsFromDb` + live Map are the store); boot no longer walks disk.
- **File mode fully intact:** every gate is `hasDatabaseUrl() && !shouldEchoToDisk()`, so DB-less
  dev + the echo-on rollback keep writing exactly as before.
- **Tests:** 3 persist gates + 3 repo-writer gates (red→green). `npm test` **107/107** · typecheck clean.

**Still to do (frozen tooling — not in the live path, doesn't gate "zero files"):** `scripts/purge-runs.ts`
(DB delete + disk cleanup, replacing `purge-logs.js`); rewrite `seed-runs.ts` + `backfill-people.ts`
to mutate via SQL; mark `rebuild-question-index.js` file-mode-only; `.gitignore`/docs refresh.



## Why this phase (and why last)

Only once every phase above has survived Carl's QA do we stop writing files — the file copies
ARE the rollback plan until here. After this phase: live writes zero app-data files; local keeps
a file echo purely for dev tooling.

## What gets built

1. **Echo off in live:** `RUN_FILE_ECHO` unset/off on the live deployment → verify a full run
   writes zero files. Local keeps echo on (reviewrun skill, review-html, gate readers).
2. **Remove disk-first fallbacks:**
   - `getSession` miss path no longer calls `restoreFromDisk` (DB only).
   - Boot `loadPersistedSessions` (disk walk) removed — DB restore only.
   - Runtime `_index.json` maintenance removed in DB mode.
3. **`scripts/purge-runs.ts`** replaces `purge-logs.js` semantics: DB delete (sessions cascade →
   artifacts) + best-effort disk cleanup for echoed/legacy dirs (including the no-state dirs
   purge-logs already handles).
4. **Out-of-process mutators rewritten to SQL:** `scripts/backfill-people.ts` (stamps personId)
   and `scripts/seed-runs.ts` mutate `sessions.state` via the DB, not files. (These are FROZEN —
   not to be run — from Phase 3 until this lands.)
5. **Cleanup:** `.gitignore` comments/docs updated; `rebuild-question-index.js` marked
   file-mode-only; dead writers deleted; `docs/reference/trackers.md` + README notes refreshed.

File mode (`hasDatabaseUrl()` false) stays fully alive — it's the supported DB-less dev mode and
the test substrate.

## Files

`backend/api/sessions.ts` · `backend/api/session-persistence.ts` · `backend/engine/questions.ts` ·
new `scripts/purge-runs.ts` · `scripts/backfill-people.ts` · `scripts/seed-runs.ts` ·
`.gitignore` · docs.

## QA scenarios (Carl)

1. On the live deployment: complete a full 1:1 → I show you `logs/` and `content/` gained ZERO
   new files, and the run is fully visible in the Library.
2. Delete a run in the UI → still gone after a server restart (the delete hit the DB).
3. Local dev with echo on still works end-to-end (run a 1:1, see both DB rows AND files).
4. Restart live mid-session → the session resumes (DB-only restore proven).

## Rollback

Echo re-enable + disk fallbacks are kept behind flags until THIS phase's green light — flipping
them back on restores the old behavior.

## Risks

- A forgotten reader still expecting files in live → Phase 3's "rename logs/ aside" QA already
  smoked this out; re-run that sweep here on the live config.
