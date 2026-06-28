# Repo tidy — make the structure CTO-clean

**Goal:** The codebase reads cleanly to a newcomer — no duplicated helpers, no oversized
files, consistent TypeScript — without destabilising Phase 005.
**Driver:** Carl
**Created:** 2026-06-28

The map, conventions, and dead-stub cleanup were done immediately (not phases — see git log
2026-06-28: `STRUCTURE.md` refresh, new `CONVENTIONS.md`, removed the dead root `tests/` stub).
What remains is *code* change, so it runs as tested phases, one at a time.

## Done means
- The `isObjectRecord` / `asRecord` / `asString` guards live in ONE module, not ~34 copies.
- ~~No `.mjs` oddity~~ — `run-debrief.mjs` is intentionally plain ESM (shared with the Vite build); left as-is.
- `queue-manager.ts` and `sessions.controller.ts` are split into focused files.
- A proven, repeatable path for the admin SPA to become TypeScript.
- `npm test` green and app behaviour unchanged after every phase.

## Phases
| # | Phase | What it lands | Status | Sequencing |
|---|---|---|---|---|
| 1 | Shared guards | One `backend/shared/guards.ts`, imported across 38 files | 🔨 verified | Anytime — safe |
| 2 | Split queue-manager | `delta-gates` ✓ + `thread-follow` ✓ out; `axis-coverage` next | 🔨 | Anytime — engine only |
| 3 | Split sessions.controller | Thin controller + `sessions.service` | ⬜ | **After** Phase 005 swaps the sessions repo |
| 4 | Admin TypeScript pilot | Shared util layer + 2–3 stages to TS; prove the toolchain | ⬜ | Anytime — frontend only |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 built + verified 2026-06-28** — guards deduped across 38 files; `typecheck` clean,
`npm test` 46/46. Awaiting Carl's glance to tick ✅. The run-debrief→ts item was dropped (it's
deliberately `.mjs`, shared with the Vite build). Phases 2–4 not started. None blocks Phase 005;
Phase 3 waits for Phase 005's sessions-repo swap.

**Phase 2 in progress 2026-06-28** — `queue-manager.ts` 1309 → 1036 lines. Two seams extracted as
pure verbatim moves, each verified (typecheck + `npm test` 46/46) and committed: `delta-gates.ts`
(2a) and `thread-follow.ts` + `queue-constants.ts` (2b). Next cut: `axis-coverage.ts` (+ the
`queue-metrics.ts` it needs), then optionally `reconcile-queue.ts` / `messages.ts` to get under
~600. Awaiting Carl's QA walk before continuing.

## Parked
- Converting ALL 47 admin stages to TS (Phase 4 only *pilots* it — the full sweep is its own plan).
- Naming normalisation of any legacy files (do it as you touch them, not as a sweep).
- Retiring the 34 legacy `/api/*` route aliases in `server.ts` (do it when the customer app no
  longer needs them).
- A shared `legacyError()` / `guardOrigin` helper to de-duplicate `server.ts` routing boilerplate.
- **Make `npm test` hermetic** — it currently regenerates `content/questions/_index.json` (and a
  couple of throwaway questions) on every run, so the tree goes dirty after testing. Tests should
  write to a temp dir, not mutate tracked content.
