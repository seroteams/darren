# Phase 1 — Split screen + live scores

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (green-lit)

## ✅ GREEN-LIT 2026-07-19 — Carl walked the full-screen split, "looks good" (commit 936a23a3)
First walk caught that v1 sat inside the normal page; rebuilt to the POC's true full-screen 50/50 and re-walked. Live scores move with the planner's real reasoning; idle axes show labelled UI copy; refresh holds. Customer app untouched.

## Built (2026-07-19) — layout rebuilt same day after Carl's catch
Carl's first walk: "this is not the design" — v1 had put the panel inside the normal
page layout. Rebuilt to the POC's TRUE full-screen 50/50 (fixed overlay on <body>,
nav rail visible, three datum lines, 560px columns, bare Typeform question, 32px
display stem). Re-verified end-to-end on the cassette walk; new screenshot below
matches the approved mock.

- New: `admin/src/ui/coach-panel.ts` (DOM) + `admin/src/ui/coach-panel-state.ts` (pure logic) + `coach-panel-state.test.ts` (7 tests) + `admin/src/styles/coach-panel.css`. Changed: `admin/src/stages/questioning.js` (split layout + panel wiring, gated by the app's build-time base URL — customer app keeps the single column).
- **Scope deviation from the phase file:** the `backend/engine/axes.ts` note-in-history change was dropped — its call site (`session-streams.ts`) is another chat's live lane. Refresh-persistence is done client-side instead (sessionStorage per session). The note is already durable in run logs (transcript + turn.json). Revisit only if cross-device mid-run resume matters.
- Offline proof: npm test 158/158, typecheck clean, `lint:tokens` clean for these files. Verified live on a $0 cassette replay of run `2026_Jul01_22-30-eb6e254d…` (server `sero-api-coach` on 3141 + web 3143, dev autologin): split renders, Wellbeing/Engagement moved with the planner's real note shown as the why, idle axes show labelled UI copy, refresh kept scores + whys, submit/skip/back unchanged. Screenshot: [shots/phase1-live-scores.png](shots/phase1-live-scores.png).
- Known cosmetic edge: an axis that moved in an *earlier* browser (no stored why on this device) shows its delta with no reasoning line — honest blank rather than invented text.
- Customer app checked by build constant + full test suite (its router tests pass); not walked visually — it has no panel by design this phase.

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
