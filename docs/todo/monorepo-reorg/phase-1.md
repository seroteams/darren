# Phase 1 — The reorg (done in small, checkable steps)

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 in progress (step 1)

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
1. **Docs room** — `git mv plans/ docs/plans/`, `git mv archives/ docs/archives/`; repoint the one reference (`eslint.config.js` ignore glob `archives/**` → `docs/archives/**`). No code imports these, so tests/app/CLI are unaffected. ← **DOING THIS ONE**
2. **Scaffold + address book** — create `backend/ admin/ content/` and the `frontend/` placeholder (README); add `backend/engine/paths.js` defining each data root. Additive only — nothing reads it yet.
3. **Content room** — move `prompts/ questions/ lexicons/ scenarios/ config/ data/ notes/ axes.json focus-points.json` → `content/`; repoint every engine/server/script read (via `paths.js` or fixed relative paths).
4. **Backend room** — move `src/ → backend/engine/`, `frontend/server/ → backend/api/`, `cli.js → backend/cli.js`; fix internal requires + `package.json` script paths (`dev`, `start`, `cli`).
5. **Admin room** — move `frontend/client/ → admin/`; update `vite.config.js` (root, alias, outDir) + `eslint.config.js` globs; leave `frontend/` as the empty placeholder.
6. **Cleanup & sweep** — `git mv smoke-test.js scripts/`; update `.gitignore` (`admin/dist`); grep-sweep for any stray old paths; final `npm test` (30/30) + offline replay + owner full-run walk.

## Not in this phase
- No renaming for clarity, no logic edits, no file splits, no dependency upgrades.
- No deleting the stray PNGs (mention only).
- No real admin/customer code split.

## Done when (whole phase)
- [ ] `npm test` → 30/30 (same as baseline).
- [ ] `node scripts/replay-scenario.js 001-priya-perf-feedback --fixtures-only` runs clean.
- [ ] No leftover references to old paths (grep clean).
- [ ] Product owner has walked the scenarios and said go.

---

## Step 1 — QA scenario (for the product owner)
Walk this; step 1 isn't done until you green-light.
1. **Tests unchanged** — `npm test` → **30/30 passed**. ❌ Not OK if the count drops or any FAIL appears.
2. **Docs filed** — `plans/` and `archives/` no longer sit at the top level; they're now under `docs/plans/` and `docs/archives/` with the same contents.
3. **Nothing else moved** — `src/`, `prompts/`, `questions/`, `frontend/` etc. are all still where they were. This step only touched docs.
4. **Lint still works** — (optional) `npm run lint` runs without a config error about the missing `archives/` path.
