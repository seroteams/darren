# Tidy the project — Monorepo Reorg (Prototype → Production · Phase 001)

**Goal:** Move the loose pile of files into five labelled rooms (`backend`, `admin`, `frontend`, `content`, `docs`) plus one "where data lives" address-book file — with **no change to how anything works**.
**Driver:** Carl
**Created:** 2026-06-23
**Tracks:** the bigger plan in [../../prototype-to-production/001-monorepo-reorg/00-phase-overview.md](../../prototype-to-production/001-monorepo-reorg/00-phase-overview.md). When this is done + approved, update that effort's `PROGRESS.md` (Phase 001 → `done`).

## Done means
- App still starts (`npm run dev`) and a full prep run works end-to-end — looks/behaves exactly as today.
- CLI still runs (`npm run cli`).
- `npm test` → **30/30** (same count as the pre-move baseline).
- Offline replay runs clean (`node scripts/replay-scenario.js 001-priya-perf-feedback --fixtures-only`).
- The tree matches the approved map: `backend/` `admin/` `frontend/` `content/` `docs/` + `backend/engine/paths.js`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The reorg | Every file moved into its room + references repointed + address book added. Done in 6 small checkable steps (see [phase-1.md](phase-1.md)) — each repoints what it touches and ends green. | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Baseline:** `npm test` → 30/30 passed (2026-06-24, free/offline). Map approved by Carl (app → `admin/`; tooling `scripts/`+`evals/`+`logs/` stay at root). A previous run-ahead had copied most of the reorg into untracked `admin/`/`backend/`/`content/` — those were byte-identical duplicates (zero unique work) and have been **deleted** to restore the clean baseline. Phase 1 now runs in **6 small steps with a check between each** (Carl's call). **Step 1 ✅** (move docs room) — committed `6020d7b`, Carl green-lit, `npm test` 30/30. **Next:** Step 2 (scaffold rooms + `backend/engine/paths.js` address book) — awaiting Carl's go.

## Decisions (Carl, 2026-06-23)
- Today's tangled web app moves whole into **`admin/`**; new **`frontend/`** is an empty placeholder for the future customer app (Phase 007). Matches the layout locked 19-Jun.
- Data room is root **`content/`** (the locked overview said `packages/content/`; using Carl's simpler name).
- `scripts/`, `evals/`, `logs/` and root build/config files **stay at root** — the five rooms hold the substance, not the tooling.

## Parked
- Real **admin-vs-customer split** of the web app — that's logic surgery, a later phase, not this one.
- The two stray screenshot PNGs (`docs/screenshots/*.png`) — flagged as debris; **not** deleting (surgical-changes rule). Carl's call later.
- `packages/`-style multi-package layout — deferred; root `content/` for now.
