# Phase 2 — Received (last turn's reply)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
On a question, the **Received** view clearly shows the raw reply the AI sent back on the
previous turn — so "what came back" sits right next to "what's going next".

## Changes
- `admin/src/ui/notes-panel.js` / `stage-data-tab.js` — rename the "Reply" tab to **"Received"** and make sure, on the questioning step, it shows the *last completed turn's* raw reply (not blank on the turn you're currently answering).
- This is mostly the existing `renderReply` content, reframed. `stage-data-tab.js` already reads logged turns via `getRunStages`; ensure it surfaces the most recent completed turn's `raw` even while you're mid-way through the next question.

## Not in this phase
- "Rules" (Phase 3).
- Any change to how replies are stored (they're already logged per turn).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **See last turn's reply** — answer one question, then on the next question open **Run panel → Received**. You should see the raw reply the AI gave for the turn you just finished. ❌ Not OK if it's blank after you've completed a turn.
2. **First question** — on the very first question (nothing answered yet), Received shows a plain "nothing back yet" rather than an error.
3. **Sits beside Sending** — Received (last turn) and Sending (next turn) together tell the before/after story of the current turn.
