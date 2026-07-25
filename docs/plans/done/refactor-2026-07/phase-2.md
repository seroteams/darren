# Phase 2 — typecheck safety net

## ✅ GREEN-LIT 2026-07-25

Carl approved on the in-chat proof (5 tsc programs green, 183/183 tests) including the tests-skip-the-indexing-rule call. Committed as 12f9c627. Built by session 17d7a976.

Goal: ~50 co-located test files (admin + frontend) and all of `shared/` were executed by `npm test` but never typechecked; `typecheck:admin`/`typecheck:customer` also weren't run by CI, so they had quietly gone red. Close the blind spot so every later phase (and all feature work) is guarded for free.

## What landed

- **Root tsconfig.json** now includes `shared/**/*.ts` (shared/sse.test.ts checked; the JS files wait for their own conversion).
- **New admin/tsconfig.test.json + frontend/tsconfig.test.json** — extend each app config, add Node globals for the test runner, and drop ONLY the undefined-on-index rule (tests index into fixtures they just built; app code keeps it). `typecheck:admin` / `typecheck:customer` in package.json now run app + test configs together.
- **The blind spot was already biting — both app typechecks were red on main.** Fixed type-level, no behaviour change:
  - `admin/src/state.d.ts` had drifted far beyond the survey: StageName missing MEMBERS/TEST/GALLERY, Store missing galleryScreen, the four promises keys, and the per-app memberHome/guestHome; `user` was untyped. Resynced + a real `StoreUser` shape.
  - `admin/src/ui/landing.ts` — landingStage/exitStage now typed StageName in/out.
  - `admin/src/ui/account-sheet.ts` — three narrow result casts where untyped shared/api.js responses flow in.
  - `frontend/src/stages/guided/guided-arcs.ts` — default arc restructured so no indexed access is needed (same objects).
  - `admin/src/ui/icon.js` — `label` gets a default `""` so its inferred type stops dropping the option the code (and its passing test) already supports; falsy-identical at runtime.
  - `frontend/src/stages/team.test.ts` — two redundant duplicate object keys removed (same runtime fixtures).

## Verification (all free)

- `npm run typecheck` + `typecheck:admin` + `typecheck:customer` — all green **with the new, wider coverage** (5 tsc programs total).
- `npm test` — 183/183 pass (proof the type fixes changed no behaviour).

## QA — what Carl checks

Internal phase: closes on the proof above.

1. ✅ Pass: the numbers above look right; you accept the one judgement call (tests skip the strictest indexing rule so future test-writing stays light — app code keeps it).
2. ❌ Fail: anything reads wrong — say which line.
