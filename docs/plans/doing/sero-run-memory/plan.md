# Run memory — never re-tread ground, and every run teaches Sero

**Goal:** A second 1:1 about the same person covers fresh ground instead of repeating what's already answered — and every run (real, friend trial, test) banks a per-question quality record Sero can learn from.
**Driver:** Carl
**Created:** 2026-07-20
**Mockup:** https://claude.ai/code/artifact/86d81ed8-6881-4faa-be80-33af773da626 — awaiting Carl's approval

## Done means
- Every turn in a run's detail screen shows a read chip: Good note / Thin / Skipped / Declined.
- A second run about the same person visibly avoids well-answered ground; skipped questions may return.
- Every run in the admin list carries an origin badge: Real / Friend trial / Internal / QA.
- A "Pool quality" screen shows, per question, how often it was asked and how often it earned a real note — split by origin.

## Resolved before we start
- "DFS" = across-runs memory (visited/open ground per person), NOT deeper single meetings — the anti-stall guards (`thread-follow.ts:111`, `enforceDrillCap`) stay untouched.
- Question TEXT may travel across runs; answer/note text never does (only derived tags + numbers). Never train on manager notes.
- v1 matching is lexical (existing Jaccard ≥ 0.7 machinery in `question-eligibility.ts`) — free. Embeddings/pgvector deferred.
- Signal computed ONCE at `planTurn` (`queue-manager.ts:308-495`, all three lanes converge there); reviewer consumes, not recomputes — kills the delta-gates/reviewer split-brain.
- Cross-run read follows the `focus-history.ts` clone pattern (per-person fence, file-vs-pg dispatcher); persona QA runs (userId=null) auto-excluded from a person's history.
- Origin lives on the ORG (`organizations.kind`) snapshotted onto the session at start — not free-text runLabel.
- Ledger table `question_asks` follows `blockScores` signal shape + `runArtifacts` no-FK rule; rebuildable from `sessions.state`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | One read signal | Every turn tagged Good note/Thin/Skipped/Declined, saved forever, chip in run detail | 🔨 |
| 2 | Fresh ground | Second run about a person suppresses well-answered priors, allows back skipped/thin ones | ⬜ |
| 3 | Origin badges | Real / Friend trial / Internal / QA on every run (org toggle + badge) | ⬜ |
| 4 | Learning ledger | `question_asks` table + Pool quality screen — every run banks rows | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 BUILT (2026-07-20), awaiting Carl's QA walk. Board: https://claude.ai/code/artifact/8aa28dc1-875b-405e-b53c-0430d8ff26a8
Proof: typecheck clean, npm test 160/160, 19/19 new tests, fixtures replay unchanged (2 pre-existing listenFor fails), chip rendered in real admin CSS.
Note: Phase 1 touched three files on chat 1b4b459f's 2-day-old lane (reviewer.ts, session-streams.ts, cli/stages/) — edits went through cleanly under Carl's go-ahead.
Baseline: free suite only (`npm test` + typecheck) — a paid `npm run gate` baseline needs Carl's explicit yes (house cost rule; the plan's one paid run is reserved for Phase 2 QA).
⚠️ Lane note: Phase 1 touches `reviewer.ts`, `session-streams.ts`, `cli/stages/` — currently claimed by chat 1b4b459f (Promises-loop P3, claimed 2026-07-18). Stale after 2 days; Carl decides at Phase 1 start.

## Parked
- Embeddings/pgvector semantic matching (only if lexical proves insufficient).
- Ranking the bank BY the ledger (prefer historically-good questions at generation time) — needs ledger data first.
- Deeper single-meeting drilling (raising thread-follow depth) — separate ask, separate risk.
- Recency decay on suppression (re-allow well-answered ground after N months).
