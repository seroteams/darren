# Coach panel — the Runner v2 split screen, for real

**Goal:** The questioning screen becomes the 50/50 split from the POC — questions left, a lavender coach panel right showing live scores with an honest "why" per axis, and (later) per-question coaching hints.
**Driver:** Carl
**Created:** 2026-07-19
**Mockup:** the /test POC walk (`admin/src/stages/tests/runner-v2.js`) + committed shots in `docs/design/runner-v2-poc/` — Carl picked design 5 "Gradient meter" 2026-07-19. That walk is the approved picture; no separate artifact mock needed.

Research behind this plan (all file:line evidence, cost estimates, privacy check):
`C:\Users\User\.claude\plans\deep-research-task-misty-honey.md` (2026-07-19, accepted).

## Done means
- A manager running a real 1:1 sees the split screen: question left, coach panel right.
- The Live-scores view shows the four axes as gradient meters, each with the model's real reasoning line — never a bare number, never a made-up "why".
- Each question shows up to 3 "How to ask" / "Listen for" hints, generated with the question.
- Only the manager ever sees the panel (server-side, same class as `brutal_truth_manager`).

## Resolved before we start (from the research)
- The per-answer "why" ALREADY exists — plan-turn's `assessment.note`, streamed live (`axes` + `note` SSE). Phase 1 is wiring, not new model output. $0/run.
- Meter number = `lastDelta` (matches the POC's −3…+3), "Not rated" = `historyLen === 0` — both already in the SSE payload.
- Hints route = generation-time (bank stage, gpt-5.4-mini): ~+$0.01–0.02/run. The live-planner route is parked — it risks the plan-turn cache cliff (~9.5k tokens).
- No DB migrations anywhere (jsonb throughout); reviewrun sees new fields automatically.
- Idle-axis lines are UI state copy, clearly not model output — the honesty line the research drew.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Split screen + live scores | Real questioning screen goes 50/50; gradient meters wired to real deltas + the model's real "why" per axis | ⬜ |
| 2 | Support hints | Questions generated with 3 hints each; Support/Live-scores toggle appears | ⬜ |
| 3 | Rationale arc gate | FOCUS_ARC_LEAK-style check so score "why" text can't carry competency framing into bi-weekly / feels-off meetings | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder set up 2026-07-19. Board: https://claude.ai/code/artifact/7638a835-d749-4676-88ce-db2fbd9c57f3
Waiting for Carl to read the phases and green-light Phase 1.
Baseline for Phase 1 will be the FREE checks (npm test — 157/157 green at deploy today — plus typecheck); the paid gate is not needed for a frontend + 5-line-engine phase.

## Parked
- Per-axis whys minted by the model each turn (Phase C of the research) — cache-cliff risk, est. +$0.10–0.25/run. Only if the corridor proves value.
- Planner-minted mid-run questions carrying hints — v1 shows the role-profile "listen for" lines as a labelled fallback instead.
- Mobile layout beyond the POC's simple stack.
