# Phase 3 — Deterministic fallback

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done (2026-06-16)

## Goal
Close the one remaining "engine can silently fail" hole: if the evaluation stage
errors or returns invalid JSON, the manager still gets an honest minimal briefing
— transcript facts + live scores, nothing invented, clearly flagged.

## What landed
- `buildFallbackBriefing({ ctx, transcript, axisState })` in `src/reviewer.js`:
  builds a valid briefing shape from transcript facts only —
  - `headline` + `understanding_paragraph` state plainly that generation failed
    and nothing is inferred;
  - `summary_bullets` = "Asked: … — they said: …" for answered turns (skipped
    excluded); empty transcript → one honest "no answers captured" line;
  - `axes` carry the real deterministic live scores from `axis_state`, with a
    meaning noting the written read couldn't be generated;
  - brutal truths / next_actions / watch_for empty; engagement `inconclusive`;
  - `generation_failed: true` flag.
- `evaluate()` now wraps the model call + JSON parse in try/catch: on failure it
  logs the stage with a `GENERATION_FAILED` flag and returns the fallback —
  surfaced, never masked. Success path unchanged.

## Verification (offline, no paid run)
- New [test-briefing-fallback.js](../../../scripts/test-briefing-fallback.js)
  (wired into `npm test`): flag set, headline/paragraph honest, bullets
  transcript-derived (skipped excluded), axes match `axis_state`, no invented
  narrative, passes the manager-briefing trust bans, empty-transcript case valid.

## Done when
- [x] Force an evaluation failure → the manager still gets an honest minimal
      summary, flagged as such. (Offline test covers the fallback builder + the
      `GENERATION_FAILED` path.)
