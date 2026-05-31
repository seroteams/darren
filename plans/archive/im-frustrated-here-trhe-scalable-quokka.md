# Plan: Focus-point flagging — CLI + UI parity

## Context
Questions in the questioning stage can be flagged with a reason (too generic, wrong level, already covered, bad framing) in both the CLI and UI. Focus points have no equivalent feedback mechanism in either interface. The user wants to be able to flag individual focus points as low-quality — same 4 reasons, same pattern — so both CLI and UI are consistent.

---

## What changes

### 1. Server — new feedback handler for focus points
**New file:** `frontend/server/handlers/focus-points-feedback.js`
- Accepts `POST` body: `{ s, focusPointId, focusPointLabel, reason }`
- Validates `reason` against `VALID_REASONS` (same 4 as question feedback: `too_generic`, `wrong_level`, `already_covered`, `bad_framing`)
- Calls `logFeedback({ dir: session.dir }, { type: "focus_point", focusPointId, focusPointLabel, reason, sessionContext: session.ctx })`
- Returns `{ ok: true }`
- Pattern mirrors `frontend/server/handlers/feedback.js` exactly

**Route registration** — `frontend/server/server.js`
- Add `router.add("POST", "/api/focus-points/feedback", ...)` after the existing `focus-points/select` route, with the same `originOk` guard

### 2. API client
**File:** `frontend/client/src/api.js`
- Add `submitFocusPointFeedback(sessionId, { focusPointId, focusPointLabel, reason })` function
- Posts to `/api/focus-points/feedback` with `{ s: sessionId, focusPointId, focusPointLabel, reason }`
- Same `postJson` wrapper pattern as `submitFeedback`

### 3. UI — focus-points stage
**File:** `frontend/client/src/stages/focus-points.js`

**Card restructure** (critical): the current card is a `<button>`, which cannot contain other buttons. Change each card to a `<div class="focus-point ...">` with:
- An inner `<button class="focus-point__select-btn js-fp-select">` that holds the number, label, reason text, and check icon — this is what the existing click-to-select listener attaches to
- A `<div class="focus-point__flag-area">` after it containing:
  - `<button class="focus-point__flag-btn js-fp-flag">Flag</button>`
  - A hidden reason picker `<div class="js-fp-picker" style="display:none">` with the 4 reason buttons and a confirmation line — identical structure to the flag picker in `questioning.js` lines 78–87

**JS changes in `renderResult()`:**
- Change `fpButtons.forEach` click handler to attach to `.js-fp-select` inside each card (not the outer div)
- For each card, wire `.js-fp-flag` to toggle `.js-fp-picker` visibility
- Wire each `.js-fp-reason` button to call `submitFocusPointFeedback`, disable the reason buttons, show `.js-fp-flag-confirm`
- Import `submitFocusPointFeedback` from `../api.js`

**Shortcuts overlay** — add `{ key: "F", label: "Flag focused item" }` to the `createShortcutsOverlay` call and add a `keydown` listener that, when `f`/`F` is pressed and the active element is a `.focus-point__select-btn`, clicks the corresponding `.js-fp-flag` button.

### 4. CLI — focus-points flagging
**File:** `cli.js`

After the existing selection loop (lines 211–224, after `selectedConcerns` is populated), add a flagging sub-flow before moving to Stage 1b (prep):

```
  Flag any focus point as low quality? (number, or Enter to skip): 
```
- If blank → skip
- If a valid number (1–N) → show reason picker: `(1) too generic  (2) wrong level  (3) already covered  (4) bad framing`
- Call `logFeedback(session, { type: "focus_point", focusPointId: fp.id, focusPointLabel: fp.label, reason, sessionContext: ctx })`
- Print confirmation: `dim("Flagged.")`
- Loop back to "Flag any focus point?" to allow flagging multiple ones; Enter to continue

---

## Files to touch
| File | Change |
|---|---|
| `frontend/server/handlers/focus-points-feedback.js` | **Create** — new handler |
| `frontend/server/server.js` | Add route `POST /api/focus-points/feedback` |
| `frontend/client/src/api.js` | Add `submitFocusPointFeedback` |
| `frontend/client/src/stages/focus-points.js` | Restructure cards, add flag UX |
| `cli.js` | Add post-selection flagging sub-flow |

## Reuse
- `logFeedback` from `src/session.js:42` — used identically, just add `type: "focus_point"` field
- `createShortcutsOverlay` from `frontend/client/src/ui/shortcuts.js` — already imported
- `submitFeedback` pattern from `frontend/client/src/api.js:53` — new function mirrors it exactly
- Same 4 `VALID_REASONS` from `frontend/server/handlers/feedback.js:4`

## Verification
1. Run `node cli.js` → complete intake → after selecting focus points, try flagging one → check `logs/<session>/feedback.json` contains `type: "focus_point"` entry
2. Run the UI dev server → go through focus-points stage → click Flag on a card → pick a reason → confirm "Flagged — thanks." appears
3. Check the server log / `feedback.json` in the session dir for the focus-point feedback entry
4. Verify pressing 1–4 still selects/deselects cards correctly after the card restructure
5. Verify the Continue button still enables/disables based on selection count
