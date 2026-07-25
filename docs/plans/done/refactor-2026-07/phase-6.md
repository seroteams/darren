# Phase 6 — shared run-row projections

## ✅ GREEN-LIT 2026-07-25

Carl approved on the parity-test proof (185/185, replay unchanged). Committed as 34f9f746. Built by session 17d7a976.

Goal: the file store (engine/run-history.ts) and the Postgres store (db/runs-store.ts) carried copy-pasted twins of every run-row shape, kept in sync only by "kept in parity with…" comments. One shared home, so a new run field can't silently diverge between them.

## What landed

- **New [backend/engine/run-projections.ts](../../../backend/engine/run-projections.ts)** (245 lines): the value-based row shapes both stores render — `finishedRow`, `memberRow`, `aboutPersonRow`, `userRunRow`, `memberView` (+ `memberTurns`, `projectCtx`) — plus the value normalisers they share (`buildHeadline`, `ratingFromValue`, `reviewSummaryFromValue`, `reviewStatusOf`, `personaTagOf`, `costFromState`, `promiseHistoryOf`, `REVIEW_DIM_KEYS`).
- **One input type, `RunFacts`** — the single place the column-vs-sidecar difference lives: the file store fills it from its sidecar files (ratingOf / isArchivedAt / reviewSummaryOf, which stay put as the dir-reading halves), the PG store from its columns via one `factsOf`.
- **Both stores rewired**, projection by projection, with the parity test run between moves. run-history.ts 846 → 668 lines, runs-store.ts 977 → 921; net −303 lines against +69, plus the new shared module.
- **Every parity comment deleted** — grep for "kept in parity" / "Mirrors pgCompareRun" / "Parity with memberRunView" now returns zero. The property is structural, not a note.
- run-history.ts re-exports the shared names, so its public API is unchanged and no consumer moved.

## Verification (all free)

- **backend/tests/runs/test-pg-runs-parity.js — passes**, run after each projection move (it deep-equals file-store and PG-store rows: finished, member, about-person, superadmin drilldown, member view, recent, rating + review sidecars).
- `npm run typecheck` — clean.
- `npm test` — **185/185**. (Note: mid-phase a run showed 184/185; the failure was a parallel session's Google sign-in test file being written at that moment, not this work — it passes now, and the count rose 183 → 185 because that session added tests.)
- `replay-scenario --regression-all --fixtures-only` — unchanged from baseline: the same 2 pre-existing styleTip fixture failures, nothing new.

## QA — what Carl checks

Internal phase: closes on the proof above.

1. ✅ Pass: the parity test passes and the numbers read right — same rows, one definition.
2. ❌ Fail: anything looks off — the whole phase is one revert.
