# Postgres runtime data — move ALL app data into the database

**Started:** 2026-07-08 · **Owner sign-off:** Carl, one phase at a time · **Method:** Darren Method

## Why this workstream exists

Sero is getting **two environments — live (deployed, real customers) and local (dev)**. Today most
runtime data lives as **files inside the repo folder** (~206 MB of run logs, 4,400+ generated
question YAMLs, role profiles, people aliases, audit trails, learning-loop data). Files only exist
on one machine — they can't sync between live and local, so history would get stranded on whichever
machine made it.

**Goal:** Postgres becomes the single source of truth for ALL app data, in both environments.
Files become an optional dev echo, then retire. Dev-tool reports (gate/sweeps/benchmark, evals)
and static content (seed/intro questions, lexicons, config) stay as files — they're not app data.

**Carl's locked decisions (2026-07-08):**
- Import ALL ~250 historical runs into the DB (Phase 6, skippable if it misbehaves).
- Local dev points at a **second Neon database** (any Postgres URL works).

## Where we start from (the deep-dive findings, 2026-07-08)

- A Postgres/Drizzle layer exists (11 tables, migrations 0000–0008) but is only half-adopted.
- `sessions` dual-writes (disk + DB mirror) but **every read still trusts disk**; boot loads disk
  first, DB second (disk wins on conflict).
- The `runs` table is defined but **nothing writes it** — safe to drop.
- The CLI (`backend/cli.ts`) and test scripts write run folders **directly to disk**, bypassing the
  DB mirror entirely.
- One shared `DATABASE_URL`; no live/local split, no boot-time migrations, no deploy config.

## The design in one picture

```
   web run ─┐                       ┌────────────────────────┐
 persona run ├─► ONE write funnel ──► 🐘 Postgres (truth)    │
   CLI run ─┘   (run-artifacts-     │  live DB  ⛔  dev DB   │
                 store.ts)          └────────────────────────┘
                      │
                      └── optional file echo (RUN_FILE_ECHO,
                          on locally, off in live) — keeps dev
                          tools working + is the rollback path
```

Key decisions (full detail in the phase files):
- **D1** Run = session → drop the dead `runs` table, extend `sessions` with index columns.
- **D2** One write funnel (`backend/db/run-artifacts-store.ts`) + `RUN_FILE_ECHO` dev echo.
- **D3** Hot-path safety: sync facades over a per-run async write queue; `flushArtifactWrites()`
  at CLI exit / server shutdown. A DB hiccup never breaks a live turn.
- **D4** Reads go async behind the existing repo seam (`RunsRepo` / `SessionsRepo`).
- **D5** Questions keep sync engine signatures via a boot-hydrated cache; `UNIQUE(alias)` is the
  dedup gate. Dedup / FOCUS_ARC_LEAK behavior identical.
- **D6** Sidecars (`review.json`/`rating.json`/`archive.json`) → columns on `sessions`;
  everything else in a run dir → generic `run_artifacts` rows `(session_key, stage, name)`.
- **Env guard:** the DB stores its own identity (`app_state` key `environment`); boot hard-exits
  on mismatch with `APP_ENV` — a copied `.env` can never write to prod.

## The phases

| # | Phase | Why | Status |
|---|-------|-----|--------|
| 1 | [Foundations](phase-1.md) — schema + boot migrate + safety catch | The live/local wall must exist BEFORE two environments do; zero behavior change = safest opener | 🔨 built, awaiting QA |
| 2 | [Write path](phase-2.md) — every new run saves to the DB too | Fill the DB while disk stays canonical — nothing can be lost; closes the CLI bypass hole | ✅ |
| 3 | [Read cutover](phase-3.md) — the app trusts the DB | Only after P2 proves writes; the org/member privacy walls get rewritten as SQL → strictest testing | ✅ |
| 4 | [Questions](phase-4.md) — the invented-question pool | Powers "never ask the same question twice" — own failure mode, own QA | ⬜ |
| 5 | [Small stores](phase-5.md) — profiles, aliases, audit, learning data | Each tiny and low-risk; one grouped phase, not five ceremonies | ⬜ |
| 6 | [Import old runs](phase-6.md) — all ~250 historical runs | Needs the shelves (P1) + proven reading (P3); purely additive, skippable | ⬜ |
| 7 | [Retire the files](phase-7.md) — stop writing files in live | Last on purpose: file copies ARE the undo button until every phase has sign-off | ⬜ |

**Safety thread:** files keep being written until Phase 7. At any point before then, one switch
flips back to files.

## Current state

- **2026-07-08 — workstream opened.** Plan approved by Carl. Baseline recorded (below), all green.
- **2026-07-08 — Phase 1 ✅ green-lit + committed (`a11f3594`).** Migrations 0009+0010 applied;
  boot-time migrate + env-guard proven live (claim AND refusal). Carl created the Sero Live Neon
  project; its URL is parked in `.env` as `LIVE_DATABASE_URL` (app doesn't read it).
- **2026-07-08 — Phase 2 ✅ green-lit + committed (`57d44b4b`).** Dual-write live behind the `logStage`/
  `upsertSession` funnel; proven free (run row + all stage artifacts land in Neon). FK dropped
  (migration 0011) so artifacts are lane-agnostic. 96/96 tests, typecheck clean, $0. Per-turn files
  + sidecars deferred (see phase-2.md). Next: Phase 3 (read cutover).
- **2026-07-09 — Phase 3 ✅ GREEN-LIT (Carl: "close"; browser walk waived — his explicit call, flagged).**
  Walk-prep on the real wiring caught 2 bugs the tests missed (non-uuid caller ids would 500 the Library;
  a claimed guest run kept the placeholder org and vanished from fenced lists) — both fixed (`bd3f2da7`)
  and every wall verified over real HTTP before the close. Next: Phase 4 (questions).
- **2026-07-09 — Phase 3 built.** Every run read now answers from Postgres when
  `DATABASE_URL` is set (file walk = DB-less mode + the one-line rollback). Write path completed first
  (per-turn files, transcript/axis/cost, pipeline-lock — all lanes, echo-gated). Double fence: SQL
  narrows, the engine's own wall functions re-check every row. Parity test deep-equals 11 reads across
  both stores on real Neon — all green; 7 DB-less fencing tests per list variant. `npm test` **101/101** ·
  typecheck clean · offline replay PASS · $0. ⚠️ Until Phase 6 imports, local lists show only runs made
  since P2 (old disk runs are safe, just not listed). Deferrals in phase-3.md.

## Baseline (2026-07-08, before Phase 1)

- `npm test`: **86/86 PASS** (incl. the pg round-trip test against the real DB)
- `npm run typecheck`: **clean**
- Paid gate baseline: not run — storage-only work; a single gate case (~$0.35) is reserved for
  Phase 2's QA where the pipeline first writes through the new path.

## Rules for this workstream

- ONE phase at a time; Carl walks each phase's QA scenarios and green-lights before the next.
- Green light = commit (local only, path-scoped — other sessions run in this repo).
- Free checks first every phase (`npm test`, `npm run typecheck`, fixtures-only replay);
  max ONE paid run per phase (~$0.35, smallest case), at QA time.
- STATUS.md updated at every phase boundary.
- No engine behavior changes — storage only.

## Parked

- Replit deploy config (`.replit` etc.) — noted in Phase 1 docs, not built here.
- Real-time sync between live and local DBs (they're deliberately separate; export/import later if needed).
- Moving dev-tool reports (gate/sweeps/benchmark/evals) into the DB — they stay files by design.
- Retiring the reviewrun skill's disk dependency — covered by the local file echo instead.
