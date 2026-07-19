# Phase 1 — Split screen + live scores

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The real questioning screen becomes the POC's 50/50 split, with the right half showing the four axes as gradient meters — each carrying the model's real one-line reasoning for its last move.

## Changes
- `admin/src/stages/questioning.js` — the 50/50 layout from the POC (grid, datum lines, lavender half); left half keeps today's question flow untouched.
- New coach-panel piece (e.g. `admin/src/ui/coach-panel.ts`) — gradient-meter rows (POC design 5): axis label, signed delta, meter, reasoning line. Meter number = `lastDelta`; untouched axes show "Not rated" + the idle line (clearly UI copy).
- Wire to the real SSE the screen already receives: `axes` (score/lastDelta/historyLen) + `note` (the model's rationale). The panel attaches each turn's note to the axes that moved that turn and keeps it as that axis's "why".
- `backend/engine/axes.ts` — add `note` to the axis-history entries (~5 lines + test), so the per-axis "why" survives a mid-run refresh and shows up in run logs / reviewrun.
- Same admin-app gating as today's runner; the frontend (customer) app is untouched this phase.

## Not in this phase
- The Support/Live-scores toggle and hints (Phase 2 — panel is scores-only for now).
- Any new model output, prompts, or paid calls. $0/run.
- The rationale arc gate (Phase 3).

## Done when
- [ ] A real run streams real deltas + notes into the panel (verified with a $0 cassette replay, not hand data).
- [ ] `npm test` + `npm run typecheck` green; screenshot of the real rendered screen taken.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
`local > admin (dev autologin) > start a 1:1 > questioning screen`
1. **The split** — open a 1:1 and reach the first question. You should see the POC's 50/50: question left, lavender panel right with four gradient meters. ❌ Not OK if the old single-column screen shows.
2. **A score moves with a why** — answer a question with something meaty (e.g. "honestly the sprint's been draining, I'm behind on the review cycle"). Within a few seconds at least one meter should move AND show a fresh plain-English line explaining the move. ❌ Not OK if a number changes with no reasoning line, or the line is generic filler.
3. **Untouched axes stay honest** — early in the run, axes nothing has touched should say "Not rated" with the grey idle line — no invented reasoning. 
4. **Refresh keeps the whys** — mid-run, refresh the browser. The meters AND their reasoning lines should come back as they were. ❌ Not OK if the whys vanish.
5. **The left half still works** — submit, skip, and back all behave exactly as before the split.
