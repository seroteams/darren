# Phase 1 — Backend preview for the current stage (Preparation)

**Lands:** a read-only preview endpoint that assembles the exact Preparation payload from live session
state, reusing the same code the real run uses, with **zero** OpenAI calls.

## Changes
1. **`src/preparation.js`**
   - Extract the inline `prepInput` assembly (lines 268–286 of `generatePreparation`) into exported
     `buildPrepInput(inputs)`. `generatePreparation` calls it — no behaviour change.
   - Add exported `assemblePreparation(inputs, { model } = {})` returning `{ model, prompt }` where
     `prompt = buildMessages(buildPrepInput(inputs)).filled`. No `callAI`.
2. **`frontend/server/handlers/preparation.js`**
   - Extract the session→inputs mapping (lines 20–27) into exported `buildPreparationInputs(session)`.
     `produce` uses it; the preview endpoint uses it too.
3. **`frontend/server/handlers/preview.js`** (new)
   - `GET /api/session/:id/preview` (or `?s=<id>`): `requireSession`, infer the current stage.
   - For `PREPARATION`: if `!session.focusPointsResult` → 409 "inputs for this stage aren't ready yet";
     else return `{ stage:"PREPARATION", label:"Prep brief", model, prompt, preview:true }`.
   - Unsupported stage → `{ stage, supported:false }`.
   - Register the route alongside `/api/runs/:id/stages`.

## QA scenarios (all free — preview makes no API calls)
1. **Endpoint, no spend.** Start a session, run Focus points, land on Preparation. `GET` the preview
   endpoint → returns the model + full prompt text. Confirm **no** cost recorded / no OpenAI request.
2. **No-drift.** Let Preparation actually run, then read its `prompt.md`. It must equal the preview's
   `prompt` byte-for-byte.
3. **Not-ready guard.** Hit the endpoint on a brand-new session (before Focus points) → 409 "not ready",
   no crash.
4. **Regression.** `npm test` → still 30/30. A real Preparation run still produces the same brief
   (extraction changed nothing).
