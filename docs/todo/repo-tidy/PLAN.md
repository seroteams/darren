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
- No `.mjs` oddity in the TS engine (`run-debrief` is `.ts`).
- `queue-manager.ts` and `sessions.controller.ts` are split into focused files.
- A proven, repeatable path for the admin SPA to become TypeScript.
- `npm test` green and app behaviour unchanged after every phase.

## Phases
| # | Phase | What it lands | Status | Sequencing |
|---|---|---|---|---|
| 1 | Shared guards + drop .mjs | One `backend/shared/guards.ts`; `run-debrief.ts` | ⬜ | Anytime — safe |
| 2 | Split queue-manager | `axis-coverage` / `delta-gates` / `thread-follow` out of the 1.3k-line file | ⬜ | Anytime — engine only |
| 3 | Split sessions.controller | Thin controller + `sessions.service` | ⬜ | **After** Phase 005 swaps the sessions repo |
| 4 | Admin TypeScript pilot | Shared util layer + 2–3 stages to TS; prove the toolchain | ⬜ | Anytime — frontend only |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder scaffolded 2026-06-28; **no phase started** — awaiting Carl's go. None of these blocks
Phase 005. Phases 1, 2, 4 are safe to run alongside Phase 005; Phase 3 touches the same
`sessions` files Phase 005 swaps, so it waits until that swap lands.

## Parked
- Converting ALL 47 admin stages to TS (Phase 4 only *pilots* it — the full sweep is its own plan).
- Naming normalisation of any legacy files (do it as you touch them, not as a sweep).
- Retiring the 34 legacy `/api/*` route aliases in `server.ts` (do it when the customer app no
  longer needs them).
- A shared `legacyError()` / `guardOrigin` helper to de-duplicate `server.ts` routing boilerplate.
