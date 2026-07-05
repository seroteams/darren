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
| 1 | Persona-run job service | `POST /api/v1/persona-runs` + `GET .../current` with job state (fake runner) + run-history rows gain personaId/mode | free | 🔨 built, awaiting walk |
| 2 | The runner | The real stage loop driving the engine end-to-end with scripted answers (offline-tested with injected fakes) | free | ⬜ |
| 3 | Hub UI + first real run | ▶ Run button, progress, history badges on the Personas page; Carl clicks one real run | ~$0.35 | ⬜ |
| 4 | Consolidation | Safety-check strip on the hub, nav slims to one entry, Compare deep-links from history | free | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 built 2026-07-05, awaiting Carl's walk.** Carl said GO same day the folder went up.
- Baseline before building: `npm test` **62/62 PASS** · `npm run typecheck` clean.
- Built: `backend/api/services/persona-runs/` (service + controller + 9 tests), routes in server.ts, `personaTagOf` on Library rows (+2 tests). Runner is an honest 5-second dry run (labels itself; real engine loop is Phase 2). No OpenAI calls anywhere.
- After building: typecheck clean · new tests 21/21 · full suite 62/63 — the one fail is `universe.test.ts`, **Carl's in-flight WIP that changed mid-session** (passed at baseline, then modified outside this session; unrelated files).
- Not committed yet — green light = commit.

## Parked
- Refactor `planStream`'s scripted path and the runner's turn loop into one shared function (deliberate duplication for now — zero blast radius on the live session path).
- Batch "run all personas" button (one at a time is the cost backstop for now).
- Auto-scoring the run with the LLM judge after it finishes (gate.js has one; keep human verdicts the calibration layer first).
- Deleting the paid "Suggest fix" button from Compare (untouched by this plan).
