# Make Sero Agent-Native

**Goal:** a coding agent can pick up a bug report or roadmap item and reproduce → implement → test → verify it offline, for $0, without stopping to ask Carl for a paid run or tribal knowledge.
**Driver:** Carl
**Created:** 2026-07-08
**Source plan:** `C:\Users\User\.claude\plans\act-as-a-nifty-wadler.md` (approved 2026-07-08)

## Done means
- An agent can replay the full 5-stage pipeline offline from a saved run folder and get the same verdict — no API key, no spend.
- The stale `.cursor` map is gone; one accurate engine map exists.
- The three "ask Carl" calls (paid-run / live-path / good-enough) are written decision tables.
- A test fails if the web and CLI stage sequences drift apart.
- A test fails if a prompt rule and its enforcing gate regex get out of sync.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Offline cassette replay | Full pipeline replays offline for $0 (verify + reproduce) | ✅ |
| 2 | Fix stale agent maps | `.cursor` rule + comments corrected; one `engine-map.md` | ✅ |
| 3 | Decision tables | paid-run / live-path / good-enough calls written down | ⬜ |
| 4 | Orchestrator parity guard | test red-flags web↔CLI stage-order drift | ⬜ |
| 5 | Prompt↔gate registry | test breaks when a prompt rule & its gate regex diverge | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Suggested run order (tonight)
**Do Phase 2 first** — it's 2–3 hours, low-risk, and stops any agent (Cursor or otherwise) loading the dead `src/` map while it works on the rest. Then Phase 1 (the flagship), then 3 → 4 → 5. Numbering follows the plan's ranking; run order is 2, 1, 3, 4, 5.

## Current state
Phases 2 ✅ and 1 ✅ done (both green-lit 2026-07-08; P2 = `2a67ec93`/`b5867ca0`). The flagship landed: any run folder replays offline for $0 in seconds. **Next: Phase 3 — decision tables** ([phase-3.md](phase-3.md)); note for its "paid run" table: cassette replay is now a free check to exhaust first. Then 4 → 5.

**Baseline (captured 2026-07-08, before any change):**
- `npm test` — ✅ 92/92 passed
- `npm run typecheck` + `typecheck:admin` — ✅ clean
- `npm run lint` — ❌ **pre-existing**: 44 problems (42 parsing errors — `frontend/*.js` + `shared/*.js` not covered as modules by the eslint config; 2 warnings). Not caused by this workstream; left as-is.

## Parked (next, not now)
- Config centralization — magic numbers across ~8 files into one named-constants module.
- Split the `reviewer.ts ↔ golden-checks.ts` circular dependency.
- Admin-console render/visual verification (Playwright or jsdom + baseline).
- k-run gate aggregation for deterministic borderline verdicts.
- Full merge of the two orchestrators into one (Phase 4 only guards parity — the merge is bigger/riskier).
