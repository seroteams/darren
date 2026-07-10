# Universe Monitoring Overlays

**Goal:** The Universe stops being just a pretty map — it shows who's coming back, what's stuck or flagged, and what runs cost, at a glance.
**Driver:** Carl
**Created:** 2026-07-10

## Done means
- A person who ran a 1:1 recently visibly glows brighter than one who's gone quiet (the Gate-1 "are managers returning" signal, on the map).
- A stalled live session, a QA-flagged run, and a member's star rating are all visible without opening logs.
- Clicking a run shows what it cost in real dollars; clicking a person shows their total.

## Resolved before we start
- **Recency needs no backend** — `lastSeenAt` is already on every run; person nodes already carry `runs[]`.
- **Star ratings are dead code in the Universe today** — `/api/v1/runs/finished` omits the `sessions.rating` column, and `universe.model.ts` reads `typeof r.rating === "number"` (never fires). Phase 2 revives it.
- **Per-run safety-gate outcomes do not exist anywhere** — `golden-checks.ts` is the offline regression suite; the live engine prevents leaks rather than recording them. So health = QA review verdict (`reviewStatus`/`overall`/`failedCount`, already on the feed) + star rating + session staleness. The map never implies a check that didn't run.
- **Cost is persisted per run** (`state.briefing.cost`, `CostSummary`) but no Universe endpoint exposes it — Phase 3 adds it to the finished feed.

## Shared design rules
- Pure derivation lives in `universe.model.ts` with node:test tests beside it; the canvas renderer stays untested by design.
- Time never enters `buildUniverse` (stays deterministic); the renderer injects `Date.now()` at draw/describe time.
- Thresholds are single exported constants (7-day recency half-life, 30-min stuck window) — tunable after watching real traffic.
- Any `/runs/finished` field lands in **both** backends in the same commit — `toFinishedRow` (backend/db/runs-store.ts) and `listFinishedRuns` (backend/engine/run-history.ts) — with the pg-parity test seeded to exercise it.
- `diffUniverse` compares node ids only, so field-only changes (new rating/verdict/cost on an existing node) won't ring the Update button — accepted.
- No new legend chips (health/recency are states, not filterable kinds). All copy plain words, ≥14px.
- Free checks only throughout — nothing here needs an OpenAI call ($0).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Return-visit glow | Person planets brighten with recent 1:1s, fade when dormant; "Last 1:1" panel row. Frontend only. | ✅ |
| 1b | Quieter map + richer panels | Declutter (labels, cross-links, weight tiers, pulses, HUD story) + every node's panel says something useful. Carl-requested 2026-07-10. | ✅ |
| 2 | Health signals | Stalled-session warning, QA-verdict rings on run moons, star ratings revived on the feed. | ✅ |
| 3 | Cost per run | Run panel shows real spend; person panel shows their total. Feed + panel rows only. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 2 ✅ closed 2026-07-11 (Carl's "a" — walk WAIVED, his call; the artifact check found his dev API predated the build so the Rating row wasn't seeable yet). Agent verification: 116/116 incl. pg-parity on real Postgres, stalled/blocked rows + rings live in the browser. Honest residual: the Rating row on screen awaits his next API restart + the first starred run. Next: Phase 3 (cost per run) — a fresh session, another day. Phase 1b ✅ green-lit by Carl 2026-07-11 ("A" on the before/after + panel walk). Map decluttered (labels, cross-links, weight tiers, pulses, HUD story) + core/stage/type/lexicon panels enriched; tests 115/115 (4 new) + typecheck clean, verified in the browser on real data. Phase 1 ✅ closed 2026-07-10 (commit b4398f23). Next: Phase 2 (health signals) — a fresh session, another day.

## Parked
- Hotter/bigger visual treatment for expensive runs (Phase 3 ships panel rows only).
- Ringing the Update button on field-only changes (needs `diffUniverse` surgery).
- Stars in the person panel's run-list subtitles (one line, but keep Phase 2 minimal).
