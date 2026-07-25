# Phase 2 — typecheck safety net

Goal: ~50 test files (admin + frontend co-located `*.test.ts`, excluded by their tsconfigs) and all of `shared/` (incl. shared/sse.test.ts) are executed by `npm test` but never typechecked. Close the blind spot so every later phase is guarded for free.

Work: stop excluding `src/**/*.test.ts` in admin/tsconfig.json + frontend/tsconfig.json; include `shared/**` TS in root tsconfig.json; fix the one-time batch of surfaced errors (type-level only — anything that looks like a runtime bug gets logged for Carl). Land one tsconfig at a time, each commit green. If the batch is huge: land shared/ first, split the rest into 2b with Carl's OK.

Verify: `npm run typecheck` + `:admin` + `:customer` all green with the new includes; `npm test` still 183/183.

QA: internal — closes on the typecheck output + the tsconfig diff. ✅ Pass: all green with wider coverage. ❌ Fail: any check red.
