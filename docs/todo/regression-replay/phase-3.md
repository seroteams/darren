# Phase 3 — In-app Regression screen

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A "Regression" item in the app's menu opens a screen that lists the saved runs, has a "Re-check all" button, and shows the green/red table — the same free check, now in the app.

## Changes
- New backend endpoints (offline): list the saved cases, and re-check them all — reusing the Phase 1 checker. New `frontend/server/handlers/qa-regression.js`; routes wired in `frontend/server/server.js`.
- New frontend screen `frontend/client/src/stages/qa-regression.js`; a "Regression" menu link in `frontend/client/src/ui/app-nav.js`; registered in `state.js`, `main.js`, `router.js`; fetch wrappers in `api.js`.
- Mirrors the existing in-app review tool (`stages/review-run.js` + `server/handlers/review.js`) so it looks and behaves consistently.

## Not in this phase
- Editing or re-saving cases from the screen (read + re-check only for now).

## Done when
- [ ] The app menu has a **Regression** item that opens the screen.
- [ ] "Re-check all" shows the 8 runs as a green/red table.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The menu item is there** — Open the app. In the menu (next to Library and Compare runs) you should see **Regression**. Click it. ❌ Not OK if it's missing or errors.
2. **Re-check all** — On that screen, press **Re-check all**. You should see 8 rows with green ticks, plus the two safety tests labelled. It should be quick and free.
3. **The alarm shows in the app** (optional, I'll help) — Ask me to "simulate a break"; after re-checking, one row should turn red "needs a look" with a plain reason. I'll undo it afterwards.
