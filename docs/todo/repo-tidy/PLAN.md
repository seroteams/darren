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
| 1 | Shared guards | One `backend/shared/guards.ts`, imported across 38 files | ✅ | Anytime — safe |
| 2 | Split queue-manager | 1309 → 434 across 5 cuts (gates/thread/axis/messages/reconcile); every module < 600 | ✅ | Anytime — engine only |
| 3 | Split sessions.controller | Thin controller + `sessions.service` | ⬜ | **After** Phase 005 swaps the sessions repo |
| 4 | Admin TypeScript pilot | Shared util layer + 2–3 stages to TS; prove the toolchain | ⬜ | Anytime — frontend only |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ ticked 2026-07-01** (Carl, QA-pile clear-out — invisible refactor, tests green). Guards
deduped across 38 files; `typecheck` clean, `npm test` 46/46 (now 52/52). The run-debrief→ts item was dropped (it's
deliberately `.mjs`, shared with the Vite build). Phases 2–4 not started. None blocks Phase 005;
Phase 3 waits for Phase 005's sessions-repo swap.

**Phase 2 split complete 2026-06-28** — `queue-manager.ts` 1309 → 434 (−67%) across 5 verbatim cuts
(2a–2e), each verified (typecheck + `npm test` 46/46) and committed: delta-gates · thread-follow +
queue-constants · axis-coverage + queue-metrics · messages · reconcile-queue + grounding. Every
engine module now under 600. Awaiting Carl's QA walk to tick ✅.

**Audit reconciliation (2026-07-01):** Phases 1 & 2 re-confirmed built + committed (`backend/shared/guards.ts`
imported across 41 files; the 5 queue-manager cuts all present) — `npm test` now **52/52**, typecheck clean.
Phase 3 is **genuinely not started**: `sessions.controller.ts` is still ~689 lines and calls the engine
directly (`planTurn`, `evaluate`, `assembleQueueWithPrepOpener`); the existing `sessions.service.ts` is the
Phase-004 storage/derivation service, **not** the orchestration extraction Phase 3 describes. Phase 4 (admin
TS pilot) also not started (no `.ts` in `admin/src/stages/`, no `admin/tsconfig.json`).

## Parked
- Converting ALL 47 admin stages to TS (Phase 4 only *pilots* it — the full sweep is its own plan).
- Naming normalisation of any legacy files (do it as you touch them, not as a sweep).
- Retiring the 34 legacy `/api/*` route aliases in `server.ts` (do it when the customer app no
  longer needs them).
- A shared `legacyError()` / `guardOrigin` helper to de-duplicate `server.ts` routing boilerplate.
- **Make `npm test` hermetic** — it currently regenerates `content/questions/_index.json` (and a
  couple of throwaway questions) on every run, so the tree goes dirty after testing. Tests should
  write to a temp dir, not mutate tracked content.
