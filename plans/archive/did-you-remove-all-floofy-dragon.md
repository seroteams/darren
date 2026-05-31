# Remove Flagging Feature

## Context
The flag feature let users mark focus points and questions as low-quality (too generic, wrong level, already covered, bad framing). It's no longer needed. Remove all flag UI, API routes, handlers, and CLI interactions. Keep `logFeedback` in `src/session.js` — it's still used for `run_rating`.

---

## Changes

### Delete entirely
- `frontend/server/handlers/feedback.js`
- `frontend/server/handlers/focus-points-feedback.js`

### `frontend/server/server.js`
- Remove `const focusPointsFeedback = require("./handlers/focus-points-feedback");` (line 16)
- Remove `const feedback = require("./handlers/feedback");` (line 22)
- Remove the `/api/focus-points/feedback` POST route (lines 80–83)
- Remove the `/api/feedback` POST route (lines 88–91)

### `frontend/client/src/stages/focus-points.js`
- Remove `import { submitFocusPointFeedback } from "../api.js";` (line 5)
- Remove the `<div class="focus-point__flag-area">…</div>` block from the template (lines 70–82)
- Remove the per-wrapper flag event-handler block (lines 96–120: flagBtn, picker, confirm, click handlers)
- Remove `{ key: "F", label: "Flag focused item" }` from the shortcuts overlay array (line 132)

### `frontend/client/src/stages/questioning.js`
- Remove `submitFeedback` from the `../api.js` import (line 2)
- Remove `{ key: "F", label: "Flag question" }` from the shortcuts overlay (line 46)
- Remove the `js-flag` button from the card HTML (line 77)
- Remove the `js-flag-picker` div and its contents from the card HTML (lines 79–88)
- Remove the `(e.key === "f" || e.key === "F")` branch from `activeEscListener` (lines 108–111)
- Remove `flagPicker` variable and its click handlers (lines 117–135)

### `frontend/client/src/api.js`
- Remove `submitFeedback` function (lines 54–62)
- Remove `submitFocusPointFeedback` function (lines 64–72)

### `frontend/client/src/styles/design.css`
- Remove the "Focus-point flag affordance" block (lines 1081–1098)

### `src/briefing.js`
- Remove `REASON_LABELS` constant (lines 86–91)
- Remove `renderFeedback` function (lines 93–113)
- Change `module.exports` to `{ renderBriefing }` only

### `cli.js`
- Update import line 17: `const { renderBriefing } = require("./src/briefing");`
- Remove Stage 1b flag section (lines 200–222: the focus-point flagging while-loop)
- Update QUESTIONING header hint (line 320): remove `· f to flag` from the dim string
- Remove the `if (answer.trim().toLowerCase() === "f")` flag block (lines 336–351)
- Remove the `renderFeedback(feedbackEntries)` try/catch block (lines 492–496)

---

## Verification
- Start the server and open the focus-points stage: no "Flag" button should appear under any focus point
- Open the questioning stage: no "Flag" button, no "F" keyboard shortcut in overlay
- Run `cli.js`: focus-point stage has no flag prompt; questioning loop has no "f to flag" hint
- Confirm no 404s or JS console errors related to removed API routes
