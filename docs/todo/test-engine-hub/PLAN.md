# Test-engine hub — RUN a persona, see the result, give feedback

**Goal:** One page where Carl clicks ▶ Run on a persona, the full engine runs with that persona's scripted answers, and he reviews the result with the existing 8-dimension feedback grid — replacing the three overlapping pages (Personas / Regression / Compare runs).
**Driver:** Carl
**Created:** 2026-07-05

## Done means
- A persona card has a ▶ Run button that states the cost (~$0.35) before clicking, shows live progress, and never runs two at once.
- A finished run opens in the existing review screen (`/run/:id`) and the verdict shows as a badge on the persona card afterwards.
- The left nav has ONE entry ("Test engine") instead of three; the free safety check lives on the same page; Compare opens from a persona's run history.

## Why this shape (short)
- The engine already runs in-process in the API server, and a scripted lane already exists (`mode:"scripted"` + `personaId` freezes the questions to the persona's script). The only missing piece is a loop that auto-submits the scripted answers — a thin orchestrator, not an engine change.
- Run folders come out identical to live runs, so the review screen and Compare work on them with zero changes.
- Matches industry best practice (Braintrust/LangSmith-style): one surface — run scenario → see result → human verdict → compare with last run.

Full background + architecture: the approved plan (2026-07-05, in Claude's plan file) — key decisions: in-process background runner (NOT spawning the CLI), one job at a time (cost backstop), 2-second polling (no SSE), results land in the normal `logs/<month>/<runId>/` structure with `fingerprint.personaId` already persisted.

## Phases
| # | Phase | What it lands | Cost | Status |
|---|---|---|---|---|
| 1 | Persona-run job service | `POST /api/v1/persona-runs` + `GET .../current` with job state (fake runner) + run-history rows gain personaId/mode | free | ✅ walked (delegated) 2026-07-05 |
| 2 | The runner | The real stage loop driving the engine end-to-end with scripted answers (offline-tested with injected fakes) | free | ⬜ |
| 3 | Hub UI + first real run | ▶ Run button, progress, history badges on the Personas page; Carl clicks one real run | ~$0.35 | ⬜ |
| 4 | Consolidation | Safety-check strip on the hub, nav slims to one entry, Compare deep-links from history | free | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ done 2026-07-05 (committed `e148db2a`). Next: Phase 2 (the real runner) on Carl's go.**
- Baseline before building: `npm test` 62/62 · typecheck clean. After: new tests 21/21, typecheck clean (the one suite fail was Carl's unrelated in-flight universe WIP).
- **Walk delegated by Carl ("YOU TEST IT FOR ME") and run live 2026-07-05** against a throwaway API instance on :3002 with the dev side-door (the real :3001 stayed untouched; it correctly 401s a logged-out caller). Results, all pass:
  - idle status when nothing runs ✓ · unknown persona → 404 plain message ✓ · missing personaId → 400 ✓
  - real start → **202** ✓ · second start while running → **409** "a run is already going" ✓
  - running status shows the honest dry-run label + startedAt ✓ · done after ~5s with finishedAt ✓ · slot frees after done (next start 202) ✓
  - no OpenAI calls anywhere (dry runner) — $0 spend ✓
- Note: the phase code was committed by a parallel session's checkpoint as a clean dedicated commit (`e148db2a`), so green-light-commit was already satisfied; this session added the walk record only.

## Parked
- Refactor `planStream`'s scripted path and the runner's turn loop into one shared function (deliberate duplication for now — zero blast radius on the live session path).
- Batch "run all personas" button (one at a time is the cost backstop for now).
- Auto-scoring the run with the LLM judge after it finishes (gate.js has one; keep human verdicts the calibration layer first).
- Deleting the paid "Suggest fix" button from Compare (untouched by this plan).
