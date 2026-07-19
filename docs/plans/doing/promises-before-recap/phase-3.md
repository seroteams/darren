# Phase 3 — The PDF payoff

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The guest recap PDF carries the agreed promises with owner labels — the document says who promised what.

## Changes
- `admin/src/ui/recap-pdf.ts` + `.test.ts` — `buildRecapDocDefinition(b, ctx, promises?)`: when promises exist, "What to do next" renders two owner-labelled blocks ("YOU PROMISED" / "{NAME} PROMISED" mini-eyebrows, when-column rows, all through `pdfSafe`); otherwise the current `next_actions` rendering stays.
- `admin/src/stages/briefing.js` — PDF call site passes `store.promises`.

## Not in this phase
- Gallery walk + trackers (Phase 4).
- A logged-in PDF button (parked).

## Done when
- [ ] A downloaded PDF from a locked guest run shows both owner blocks; a skipped run's PDF shows the suggestions fallback. Open the actual files — the DESTINATION, not the code.
- [ ] `npm test` + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > incognito window > guest run to the recap`
1. **PDF with promises** — lock in promises, then "Save as PDF". Open the file: "What to do next" should show *You promised* and *{Name} promised* blocks with your wording. ❌ Not OK if it shows Sero's raw suggestions.
2. **PDF after skip** — new guest run, skip the promises page, save the PDF. It should show the suggested actions like today.
