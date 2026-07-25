# Phase 1 — dead-code sweep (backend + scripts)

**Built 2026-07-25 (session 17d7a976). Awaiting Carl's green light.**

Goal: delete everything the survey confirmed dead, with grep evidence per deletion. Pure weight loss — no new abstractions, no behaviour change.

## Deleted (zero importers verified by grep before each)

| File | Why dead |
|---|---|
| backend/engine/paths.mjs | Untracked byte-duplicate of the live paths.mts; zero importers. |
| backend/api/services/checks/checks.service.ts + backend/tests/checks/test-checks-service.js | No route, no controller, no consumer — the "free checks" UI button it served was removed earlier (cleanup report 2026-07-21 item G). |
| backend/api/middleware/admin-guard.test.ts | Its subject `requireAdminRoute` retired (below); the still-live `requireAdmin` pure-gate tests moved to the convention-correct home, new **require-auth.test.ts**. |
| scripts/plan-turn-size-report.js | One-shot from the closed plan-turn-slim track; sole consumer of `gpt-tokenizer` (devDep dropped with it). |
| scripts/lint-bank.js | Zero callers (the benchmark cluster that once imported it is long gone). |
| scripts/check-role-profile-injection.js | One-shot investigation script (2026-06-26). |
| scripts/backfill-people.ts, backfill-runs.ts, test-backfill-mapping.js | One-shot data migrations for completed tracks (people-roster, postgres-runtime-data); the test guarded a migration that already ran. |
| scripts/batch-m4-verify.js | Closed-milestone verifier; its one consumer (eval.js:20 spawn) removed first. |

## Edited

- **admin-guard.ts** — removed dead `requireAdminRoute` (replaced by requireInternalAdminRoute in admin-lockdown P2; only its own test referenced it); header comment rewritten to match.
- **superadmin.service.ts** — removed unused export `PULSE_RANGES`.
- **Un-exported 6 internals** used only in-file: toAboutPersonRow, toUserRunRow, pgReadPipelineLock (runs-store.ts), ngramSet (serve-checks.ts), normalizeAnswer (read-quality.ts), fileWritePromiseOutcomes (promise-history.ts).
- **session-log.test.ts → session.test.ts** — file named a module that doesn't exist; it tests session.ts.
- **eval.js** — dropped the spawn of batch-m4-verify.js (+ now-unused spawnSync import).
- **rebuild-question-index.js** — `--prune` walk now skips `_runtime` like the engine's own walk (questions.ts). Closes the hazard of --prune treating per-session runtime YAMLs as prunable duplicates. Index output unchanged (the index itself was already built by the engine walk).
- **scripts/README.md** — rewritten: the `verify-*.js` family it described no longer exists; it claimed no tests live in scripts/ (36 do); now also names the kept manual tools.
- **.claude/launch.json** — removed 4 dead entries: sero-prod-iso (points at nonexistent server.js), sero-api-coach/sero-web-coach (hardcoded cassette path in a dead session's scratchpad), verdict-review (target logs/benchmark/messy-12 no longer exists).
- **package.json / package-lock.json** — `gpt-tokenizer` devDependency removed.

## Deviations from the approved plan (kept, not deleted)

Three files the plan listed as dead turned out to be documented manual tools; deleting them would break living workflows:

- **scripts/focus-example.js** — the promote-good-runs-into-prompt-examples loop, referenced by content/prompts/generate-focus-points.md's curation note.
- **scripts/rebuild-profiles.js** — the only rebuild path for gitignored derived per-person profiles (.gitignore points at it).
- **scripts/replay-capture.js** — the documented way to re-freeze replay regression baselines (and the fix for the drift found below).

## Verification (all free)

- `npm test` — **183/183 pass** (includes the renamed session.test.ts and new require-auth.test.ts).
- `npm run typecheck` — clean.
- `node --check` on both edited scripts — clean.
- `replay-scenario --regression-all --fixtures-only` — 4/6 scenarios clean; **2 fail on pre-existing baseline drift**: fixtures frozen before commit 7ecce792 added the styleTip validator rule. Proven pre-existing by stashing Phase 1 and re-running (identical failure). Logged in plan.md, not fixed here.

## QA — what Carl checks

Internal phase: closes on the proof above (evidence-first approvals, 2026-07-20), no click-walk needed.

1. ✅ Pass: the test/typecheck numbers above look right to you and nothing in the deleted list rings a "wait, I use that" bell.
2. ❌ Fail: anything in the deleted list is something you actually use — say which, it comes straight back (every deletion is one git revert away).
