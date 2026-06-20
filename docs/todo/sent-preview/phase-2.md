# Phase 2 — Sent tab shows the live preview

**Lands:** in the runner, the **Sent** tab shows the about-to-send payload for the current stage before
it runs, clearly labelled as a preview; after the stage runs it reverts to the existing logged view.

## Changes
1. **`frontend/client/src/api.js`** — add `getStagePreview(sessionId)` → `GET /api/session/:id/preview`.
2. **`frontend/client/src/ui/stage-data-tab.js`**
   - When the current live stage has **no logged stage** yet (today's "Waiting…" path in `renderSent`),
     fetch the preview and render its `prompt` via the existing `block(..., { details: true })`.
   - Distinct heading: **"Show exact text we're about to send (preview — not yet sent)"**, plus a short
     note so a preview is never mistaken for a confirmed send.
   - Once the stage logs, fall back to the existing "Show exact text sent to the model" exactly as now.
   - Raw text, no rewording (engine honesty). Reuse the existing Copy button.

## QA scenarios (all free)
1. **Before send.** Run to Step 3 (Preparation), open **Sent** → see the real prompt (your notes, name,
   focus points) before running, headed "about to send (preview)".
2. **After send.** Run Preparation → Sent now shows the logged "exact text sent to the model" (no
   preview banner). Reply tab shows the raw answer.
3. **Other stages unchanged.** Steps that haven't been extended still show "Waiting…/this step doesn't
   send anything".
4. **No console errors; no API spend** beyond the normal stage run.
