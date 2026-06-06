# Plan — In-app "Run Review" (verdict form) in the library

Internal QA tooling. A read-only view of a **finished** Sero run with an 8-dimension
pass/fail verdict + one note, saved per run. **Not** part of the live manager flow.
Mirror the UX of the standalone tool (`scripts/verdict-template.html`), not its plumbing.

## Scope (fixed)

- Finished runs only (run has a `briefing`).
- Read-only run view: prep brief → questions → final briefing.
- 8 pass/fail verdict dimensions + one note per run.
- Saves `review.json` to the run folder. **Review mode writes nothing else.**
- "Copy all" button.

Out of scope: inline diagnostics/lint signals, per-dimension notes, multi-reviewer,
localStorage caching, any manager-facing placement. Do not add features.

## The 8 dimensions (keep verbatim, prep-first ordering is deliberate)

1. Role / seniority / meeting awareness (prep)
2. Grounded / no over-inference (prep)
3. Useful & short enough (prep)
4. Trust boundary (no private-judgement leak)
5. Right arc for the meeting
6. Adapts to the person
7. Questions are useful
8. Final briefing is evidence-based

## Strict review schema (frozen)

```js
{
  version: 1,
  marks: { [dimKey]: "pass" | "fail" | null },  // keys validated against the 8; unknown keys dropped
  note: string,                                  // single note, capped length
  reviewStatus: "none" | "partial" | "complete", // DERIVED from marks, never set by client
  ts: number
}
```

`reviewStatus` is computed, not a separate source of truth:
- 0 marks → `none`
- 1–7 marks → `partial`
- 8 marks → `complete`

The serializer recomputes it on every read/copy so it can't drift from `marks`.

## Rules

- **No-mutation:** the review handler writes **only** `review.json` in the run folder.
  It must NOT call `persist(session)` or touch `state.json` / `transcript.json` / `notes.md`.
- **Disk, not session:** finished runs have no live in-memory session. The handler operates
  on the run folder **by id** (read → merge → write), unlike `notes.js` which goes through
  `requireSession`. Mirror notes.js's file-writing shape only.
- **One shared serializer:** a single `serializeReview` module produces stable, deterministic
  text (fixed dimension order, fixed key order, no Date-dependent fields in the copy body).
  Used by Copy-all so repeated copies are byte-identical.

## Build order

### Backend
1. Extend `compareRun()` in `src/run-history.js` (currently reads `01-focus-points` + `briefing`,
   **not** prep — confirmed gap):
   - add `prep` from `01b-preparation/response.json` (null if absent),
   - attach `review` by reading `review.json` from the run dir, so the UI hydrates in one call.
2. New handler `frontend/server/handlers/review.js`:
   - `POST /api/runs/:id/review` → validate against the strict schema, recompute `reviewStatus`,
     write **only** `review.json` to the run folder.
   - Register in `server.js` with the same `originOk` guard the DELETE route uses.
   - No GET needed — step 1 returns the review.

### Frontend
3. Shared `serializeReview` module (Copy-all uses it).
4. Add `REVIEW_RUN` to `STAGES` (`state.js`); create `frontend/client/src/stages/review-run.js`:
   - reads `store.reviewRunId`, fetches the run, renders prep / questions / briefing via the
     `stage-review.js` SECTIONS renderers + the verdict panel copied from `verdict-template.html`.
   - **Prep null → render "Prep unavailable"**, never crash.
   - Copy the in-place Pass/Fail handler (no re-render → no scroll jump).
   - Autosave (debounced) with three visible states: **Saving / Saved / Save failed** (+ Retry on fail,
     keeping marks in memory).
5. Run-row in `frontend/client/src/stages/start.js`:
   - add a **Review** button,
   - **remove Resume** on finished rows (gate on `stage !== BRIEFING`),
   - keep **Delete** secondary/demoted,
   - show a badge driven by `reviewStatus` (`partial` / `complete`).

## Acceptance criteria

- Review opens a read-only view; prep renders or shows "Prep unavailable" — never crashes.
- 8 marks + note persist to `logs/<month>/<run>/review.json`; reload restores them.
- Autosave visibly cycles Saving → Saved; forced error shows Save failed + Retry.
- Library badge reflects derived `reviewStatus`: none / partial / complete.
- Copy-all output is byte-identical across repeated copies, matching the serializer order.
- After a review session, `git status` on the run dir shows **only** `review.json` changed.
- Resume absent on finished rows; Delete present but secondary.

## Decision: Go

## Pointers
- UX to mirror: `scripts/verdict-template.html` (layout, CSS feel, Pass/Fail handler, 8 dimensions).
- Reference for per-run data assembly: `scripts/benchmark.js` `processRun()`.
- Persistence shape reference (file writing only): `frontend/server/handlers/notes.js`.
- Read-only section renderers: `frontend/client/src/ui/stage-review.js` SECTIONS.
- Verify against a known run, e.g. `logs/june/2026_Jun06_09-30-c6c3192b`.
