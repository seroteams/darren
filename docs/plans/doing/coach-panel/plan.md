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
| 1 | Split screen + live scores | Real questioning screen goes 50/50; gradient meters wired to real deltas + the model's real "why" per axis | ✅ |
| 2 | Support hints | Questions generated with 3 hints each; Support/Live-scores toggle appears | ✅ |
| 3 | Rationale arc gate | FOCUS_ARC_LEAK-style check so score "why" text can't carry competency framing into bi-weekly / feels-off meetings | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ GREEN-LIT 2026-07-19** — Carl walked the split screen and said "looks good" (after one rebuild: v1 sat inside the page, v2 is the POC's true full-screen 50/50). Committed 936a23a3. 158/158 tests, typecheck + lint:tokens clean, verified on a $0 cassette walk + screenshot.
**Phase 2 ✅ GREEN-LIT 2026-07-19** (commit ecf9b28b) — Carl walked the toggle + Support view, "looks good". Contract + panel signed off; two pieces PARKED (below).
**Next: Phase 3 — Rationale arc gate.** NOTE it is partly lane-blocked too (its prompt line lives in content/prompts/plan-turn.md, another chat's lane) — the golden-checks.ts gate + tests are free to build; the prompt reminder waits with Phase 2's prompt edit.
Board: https://claude.ai/code/artifact/7638a835-d749-4676-88ce-db2fbd9c57f3

## Parked
- **Phase 2 prompt edit** — teach content/prompts/generate-questions.md to WRITE ≤3 hints/question (+ example + the "never emit other fields" hard rule + RESPONSE_SCHEMA already accepts them). Blocked by the promises-loop chat's lane on content/prompts/. Do it when the lane frees; then one ~$0.35 gate proof for hint quality (Carl's nod).
- **YAML codec array support** — the file/seed path (questions.ts codec) can't store hints; extend stringify/parse for a list-of-objects, OR keep hints DB-jsonb-only (works live). Decide when the prompt edit lands.
- Per-axis whys minted by the model each turn (Phase C of the research) — cache-cliff risk, est. +$0.10–0.25/run. Only if the corridor proves value.
- Planner-minted mid-run questions carrying hints — v1 shows the role-profile "listen for" lines as a labelled fallback instead.
- Mobile layout beyond the POC's simple stack.
