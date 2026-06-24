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
| 1 | The reorg | Every file moved into its room + references repointed + address book added. Done in small checkable steps (see [phase-1.md](phase-1.md)) — each repointed what it touched and ended green. | ✅ agent-verified, awaiting Carl's QA walk |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Baseline:** `npm test` → 30/30 (2026-06-24, free/offline). Map approved by Carl (app → `admin/`; tooling `scripts/`+`evals/`+`logs/` stay at root). A previous run-ahead's untracked duplicate copies were deleted to restore a clean baseline before starting.

**All steps done + agent-verified (overnight, free checks only):** 1 docs→`docs/` (`6020d7b`) · 2 address book `backend/engine/paths.js` (`a68556f`) · 3a wire engine reads through it (`781731e`) · 3b move content→`content/` + flip (`b297412`) · 4 engine/api/cli→`backend/` (`00d2a75`) · 5 UI→`admin/`, `frontend/` placeholder (`62af687`) · 6 cleanup + straggler sweep + docs (`c4fac17`). Also fixed several `__dirname`-relative paths the moves broke (env/.env, session logs, pipeline-lock, cli `./src`).

**Verified:** `npm test` 30/30 after every step; offline replay clean; dev server boots on new paths (`backend/api` + vite root `admin`, `.env` key loads, sessions restore, `/todo` 200); `cli.js` require chain resolves; `manual-qa-verify` green; final grep sweep shows no old root-path references.

**✅ SIGNED OFF (Carl, 2026-06-24).** Carl walked the app + full prep run + CLI and gave the go. Free checks re-run at sign-off: `npm test` 30/30, offline replay clean, five rooms + address book correct, no stale root references. Removed an empty leftover root `lexicons/` folder (untracked debris; real one is `content/lexicons/`). Effort `PROGRESS.md` updated (001 → `done`); folder moved to `docs/todo/done/`. **Not** started Phase 002 (needs your go).

## Decisions (Carl, 2026-06-23)
- Today's tangled web app moves whole into **`admin/`**; new **`frontend/`** is an empty placeholder for the future customer app (Phase 007). Matches the layout locked 19-Jun.
- Data room is root **`content/`** (the locked overview said `packages/content/`; using Carl's simpler name).
- `scripts/`, `evals/`, `logs/` and root build/config files **stay at root** — the five rooms hold the substance, not the tooling.

## Parked
- Real **admin-vs-customer split** of the web app — that's logic surgery, a later phase, not this one.
- The two stray screenshot PNGs (`docs/screenshots/*.png`) — flagged as debris; **not** deleting (surgical-changes rule). Carl's call later.
- `packages/`-style multi-package layout — deferred; root `content/` for now.
- **`smoke-test.js` → `scripts/`** (move-map item) — left at repo root. Its `spawn("smoke-test.js")` callers live only in paid run paths (gate/batch), so the move can't be verified offline; harmless where it is. Carl's call whether to finish it.
