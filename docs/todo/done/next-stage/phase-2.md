# Phase 2 — Persistence / session continuity

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done (2026-06-16)

## Goal
A partial web run survives a server restart or closed tab and resumes from the
last answered question — file-based, no database.

## What's in place
- `frontend/server/session-persistence.js` — `serialize` writes the full
  turn-affecting session state (ctx, focus, prep, `queueRef`, `axisState`,
  `transcript`, `turn`, `turnSnapshots`, agenda flags, notes…) to
  `session-state.json`; `restoreFromDisk` / `restoreSessionAtDir` rebuild it and
  re-create the ephemeral Maps; `loadPersistedSessions` restores on boot.
- `frontend/server/sessions.js` — `createWebSession` persists on creation; the
  handlers persist on each mutation (e.g. `back.js`, plan).
- Resume point comes from `inferStage` (mirrored in `snapshot`); the client
  rehydrates by the stored `seroSessionId` (`main.js` → `rehydrateById`).
- Access boundary: session files are single-user local; private manager notes
  live only in the session record, never in shared output (board rule 7).

## Verification (offline, no paid run)
- New [test-session-resume.js](../../../scripts/test-session-resume.js) (wired
  into `npm test`): build a mid-interview session → persist → drop from memory
  (simulated restart) → `restoreFromDisk` → same turn, transcript, queue, and
  bank-ready flag; resume stage is `QUESTIONING`; ephemeral Maps rebuilt.
- Also exercised in practice tonight: the live API server was stopped and
  restarted mid-session with no data loss.

## Done when
- [x] Kill the server mid-interview, restart, reopen — the run continues from the
      last answered question. (Round-trip proven offline + server restarted live.)
