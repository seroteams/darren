# Phase 3 — Engine: stock questions respect the focus

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A meeting about Performance & feedback never gets a generic stock question about something else. The stock pool knows which focus areas each question suits, and the pickers use that.

## Changes
- `content/questions/_seed/*.yaml` (8 files) — add a small focus-fit field to each stock question.
- `backend/engine/axis-coverage.ts` — when coverage splices a question in, prefer a generated (grounded) one; fall back to a stock question only if it fits the meeting's focus.
- `backend/engine/closer.ts` + the overflow path in `backend/api/services/sessions/session-streams.ts` — same preference when the queue runs dry.
- Tests first (mirrored test files) — the axis-coverage guarantee (all four scores get a read) must survive; only *which* question delivers it changes.

## Not in this phase
- The full planner-grounding fix (prefer grounded questions everywhere) — parked in plan.md.
- No new stock questions, no prompt changes.

## Done when
- [ ] Tests prove: off-focus stock question filtered, axis coverage still guaranteed.
- [ ] Free replay (`node scripts/replay-scenario.js <id> --fixtures-only`) shows a sensible question list.
- [ ] One paid check (`node scripts/gate.js --only <case>`, ~$0.35, stated before running) is clean.
- [ ] Product owner has tested the scenario below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase.
1. **On-focus questions** — `local > npm run dev > localhost:3001 > new 1:1 with focus "Performance & feedback"`. Read the 7 questions as they come. Each should plausibly serve performance and feedback. ❌ Not OK if a question like "When you're not working, are you actually recovering?" appears in this meeting.
2. **Wellbeing still gets a read** — same run, at the end: the Final read still shows something (even 0 / "Not rated") for every score. ❌ Not OK if a score row is missing entirely.
