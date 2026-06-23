# Phase 1 — The reorg (done in small, checkable steps)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ all steps agent-verified — awaiting Carl's QA walk + sign-off

## Goal
Move every file into its room (`backend` / `admin` / `frontend` / `content` / `docs`), add the address book `backend/engine/paths.js`, and repoint every reference — so the app, CLI, and tests behave identically.

## How we're doing it
Carl wants **small numbered steps with a check between each**, not one big move. So each step below repoints the references it touches and ends green (`npm test` → 30/30), leaving the app and CLI runnable. The full end-to-end "do a whole prep run" walk happens after the structural moves (steps 3–5).

## The move-map
| Current | New |
|---|---|
| `plans/` | `docs/plans/` |
| `archives/` | `docs/archives/` |
| *(new)* | `backend/engine/paths.js` (address book) |
| `prompts/` `questions/` `lexicons/` `scenarios/` `config/` `data/` `notes/` `axes.json` `focus-points.json` | `content/…` |
| `src/` | `backend/engine/` |
| `frontend/server/` | `backend/api/` |
| `cli.js` | `backend/cli.js` |
| `frontend/client/` | `admin/` |
| *(new)* | `frontend/` (empty placeholder + README) |
| `smoke-test.js` | `scripts/smoke-test.js` |
| `scripts/` `evals/` `logs/` + root build/config | *(unchanged)* |

## Steps (each is its own checkpoint — green before the next)
1. ✅ **Docs room** — `git mv plans/ docs/plans/`, `git mv archives/ docs/archives/`; repoint the one reference (`eslint.config.js` ignore glob). Committed `6020d7b`.
2. ✅ **Address book** — added `backend/engine/paths.js` (every data root in one place). Committed `a68556f`. (Skipped empty `admin/`/`content/` folders + `frontend/` placeholder README — git ignores empty dirs, and those get created when files move in (steps 3b/5); the `frontend/` README belongs in step 5 when the live app actually leaves `frontend/`.)
3. ✅ **Content room** — split for safety (read-sites were far more than first scoped + touch the content-lock machinery + non-test-covered scripts):
   - **3a** ✅ — wired the engine's content reads through `paths.js`, moved nothing (`CONTENT_DIR === ROOT`, byte-identical). Committed `781731e`.
   - **3b** ✅ — `git mv` the nine content roots into `content/`, flipped `CONTENT_DIR → ROOT/content`, repointed the scripts, grep-swept. Committed `b297412`.
4. ✅ **Backend room** — moved `src/ → backend/engine/`, `frontend/server/ → backend/api/`, `cli.js → backend/cli.js`; fixed requires + `package.json` + vite alias + several `__dirname`-relative paths the move broke (`.env`, logs, pipeline-lock, cli `./src`). Committed `00d2a75`.
5. ✅ **Admin room** — moved `frontend/client/ → admin/`; updated `vite.config.js` (root, outDir) + server `CLIENT_DIST` + `eslint.config.js` globs + `.gitignore`; `frontend/` is now the placeholder + README. Committed `62af687`.
6. ✅ **Cleanup & sweep** — fixed the last stale path references (source files read as text); updated `README.md` + `docs/STRUCTURE.md`; final grep sweep clean. Committed `c4fac17`. (`smoke-test.js → scripts/` **parked** — see PLAN.md Parked.)

## Not in this phase
- No renaming for clarity, no logic edits, no file splits, no dependency upgrades.
- No deleting the stray PNGs (mention only).
- No real admin/customer code split.

## Done when (whole phase)
- [x] `npm test` → 30/30 (same as baseline). ✅
- [x] `node scripts/replay-scenario.js 001-priya-perf-feedback --fixtures-only` runs clean. ✅
- [x] No leftover references to old paths (grep clean). ✅
- [ ] Product owner has walked the scenarios and said go. ← **Carl: this is the one left**

---

## Step 1 — QA scenario (for the product owner)
Walk this; step 1 isn't done until you green-light.
1. **Tests unchanged** — `npm test` → **30/30 passed**. ❌ Not OK if the count drops or any FAIL appears.
2. **Docs filed** — `plans/` and `archives/` no longer sit at the top level; they're now under `docs/plans/` and `docs/archives/` with the same contents.
3. **Nothing else moved** — `src/`, `prompts/`, `questions/`, `frontend/` etc. are all still where they were. This step only touched docs.
4. **Lint still works** — (optional) `npm run lint` runs without a config error about the missing `archives/` path.
