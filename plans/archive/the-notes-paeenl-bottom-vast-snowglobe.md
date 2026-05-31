# Plan: Drop "Enter to save" from notes-panel textarea placeholder
**Version:** v1

## Caveman version
Placeholder text inside notes textarea say "Type a note about this stage. Enter to save." Redundant — hint below textarea already say "Enter to save · Shift+Enter for new line". Trim placeholder to just describe what to type. One-line edit.

## Changelog
- v1: Initial plan

## Context
User reports notes panel (bottom-right) shows "Enter to save" overlaying input field. Confirmed via AskUserQuestion: the overlay is the **placeholder text inside the textarea** (`placeholder="Type a note about this stage. Enter to save."`), not a CSS bug with the hint span below. The keybinding hint is already rendered as a separate span beneath the textarea, so the placeholder repetition is redundant and visually noisy.

## Change

**File:** `frontend/client/src/ui/notes-panel.js:32`

```diff
-      <textarea rows="4" placeholder="Type a note about this stage. Enter to save."></textarea>
+      <textarea rows="4" placeholder="Type a note about this stage…"></textarea>
```

That's it. No CSS changes. No other call sites.

## Verification
1. Run `npm run dev` (or whatever starts the frontend) and open a session where notes panel is visible (any stage outside INTAKE/ERROR with a sessionId).
2. Confirm empty textarea now shows only `Type a note about this stage…` as placeholder.
3. Confirm the `Enter to save · Shift+Enter for new line` hint still appears below the textarea (unchanged).
4. Type a note, press Enter → saves. Shift+Enter → newline. Behavior unchanged.
