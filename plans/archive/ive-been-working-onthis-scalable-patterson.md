# Plan: Feedback Flagging (CLI + UI) + Changelog System

## Context
The user wants to be able to flag questions (and regenerate focus points) during sessions — both in the CLI and the UI. Flagged questions are saved to `feedback.json` in the session log. This creates a traceable record for improving prompts later. A changelog system is also added so every code/prompt change is documented with a reason.

Current state: no feedback mechanism exists in either interface.

---

## Feedback Data Structure

Each flag written to `logs/{sessionId}/feedback.json` (array, appended per flag):

```json
{
  "timestamp": "2026-05-05T14:00:00.000Z",
  "questionAlias": "q_billing_rewrite_clarity",
  "questionLabel": "Billing rewrite clarity",
  "questionText": "What do you see as the top priorities...",
  "reason": "wrong_level",
  "sessionContext": {
    "name": "Darren",
    "role": "CTO",
    "seniority": "Senior",
    "meetingType": "Bi-weekly check-in"
  }
}
```

Four reason codes: `too_generic` · `wrong_level` · `already_covered` · `bad_framing`

---

## Files to Create

### `frontend/server/handlers/feedback.js`
New POST handler. Reads `{ sessionId, questionAlias, questionLabel, questionText, reason }` from body. Calls `logFeedback()` from `src/session.js`. Returns `{ ok: true }`.

### `notes/CHANGELOG.md`
Structured changelog. Every entry: date, what changed, which file, and why. Template:
```
## 2026-05-05 — Feedback flagging system
Files: src/session.js, cli.js, frontend/...
Why: enable in-session question flagging to feed prompt improvement loop
```

---

## Files to Modify

### 1. `src/session.js`
Add `logFeedback(session, entry)`:
- Reads existing `feedback.json` if it exists, appends new entry, writes back
- Entry includes timestamp + whatever the caller passes
- Export it alongside existing exports

### 2. `cli.js`
**Questioning loop** (around line 201, 215):
- Add `· f to flag` to the QUESTIONING header hint
- After `const answer = await ask(...)`, if `answer.trim().toLowerCase() === 'f'`:
  - Print the 4-option reason menu
  - Ask `Pick (1–4):`
  - Map number to reason code
  - Call `logFeedback()` with question alias, label, text, reason, ctx
  - Print `  Flagged.` then re-prompt for the actual answer on the same question

**Focus points screen** (around line 154):
- Change the continue prompt to: `[Y]es / [r]egenerate / [n]o`
- If `r`: re-run `generateFocusPoints`, re-display, loop back to the same prompt

### 3. `frontend/server/server.js`
Add:
```js
const feedback = require("./handlers/feedback");
router.add("POST", "/api/feedback", (c) => {
  if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
  return feedback(c);
});
```

### 4. `frontend/client/src/api.js`
Add `submitFeedback(sessionId, payload)` — POST to `/api/feedback`, same pattern as `submitAnswer`.

### 5. `frontend/client/src/stages/focus-points.js`
Add a third button `Regenerate` in the button row (line 71–74). On click: close existing SSE, re-mount the stage (call `setState({ stage: STAGES.FOCUS_POINTS })` which re-runs mount).

### 6. `frontend/client/src/stages/questioning.js`
In `renderResult` (the question card, lines 59–69):
- Add a `Flag` button next to `Skip`
- On click: show an inline reason picker (4 options as small buttons)
- On reason selected: call `submitFeedback(...)`, show brief `Flagged ✓` confirmation, dismiss picker
- Question stays on screen — user still answers or skips normally after flagging

---

## Changelog Rule (for the user)

Every time a prompt or code change is made, add an entry to `notes/CHANGELOG.md` in this format:
- **Date** — today's date
- **What** — one sentence describing the change
- **Files** — which files were touched
- **Why** — the reason (reference feedback.md failure modes where relevant)

---

## Critical Files
- `src/session.js` — add logFeedback()
- `cli.js` — add flag flow in questioning loop + regenerate at focus points
- `frontend/server/handlers/feedback.js` — new file
- `frontend/server/server.js` — register new route
- `frontend/client/src/api.js` — add submitFeedback()
- `frontend/client/src/stages/focus-points.js` — add Regenerate button
- `frontend/client/src/stages/questioning.js` — add Flag button + inline picker
- `notes/CHANGELOG.md` — new file, first entry documents this change

---

## Verification
1. CLI: run `node cli.js`, at a question type `f` → reason menu appears → pick a number → `Flagged.` → re-prompted → answer normally → check `logs/{session}/feedback.json` has the entry
2. CLI: at focus points, type `r` → re-generates → shows new focus points
3. UI: run `npm run dev`, go through to questioning → click Flag → pick a reason → `Flagged ✓` appears → question still visible → answer normally → check session log for feedback.json
4. UI: on focus points screen, click Regenerate → orb reappears → new focus points shown
