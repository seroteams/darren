# Phase 2 — Add your own words

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built, awaiting product-owner test

## Goal
On the Job lexicons page, you can add your own words to a job and remove ones you added. Your words are saved separately from the AI's and never overwrite them.

## Changes
- `src/role-profile.js` — per-job overlay file (`data/role-profiles/<key>.overlay.json`): load it, add a word, remove a word you added. When listing a job, merge the AI's words with yours and tag which are yours.
- `frontend/server/handlers/role-lexicons.js` — add "add a word" and "remove your word" actions.
- `frontend/server/server.js` — register the add/remove routes.
- `frontend/client/src/api.js` — `addRoleLexiconTerm()`, `removeRoleLexiconTerm()`.
- `frontend/client/src/stages/job-lexicons.js` — an "add a word" box per job; your words shown with a small "yours" marker and a remove (×) control. The AI's words have no remove control.

## Not in this phase
- Your words reaching a live run (Phase 3) — this phase only saves them and shows them on the page.
- Editing the AI's words (we never touch those).

## Done when
- [ ] You can add a word (term + meaning) to a job and see it appear.
- [ ] Your words are visibly marked as yours, separate from the AI's.
- [ ] You can remove a word you added; the AI's words have no remove control.
- [ ] Your words survive a refresh (saved to disk).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Add a word** — open a job, add a word (e.g. term "Standup", meaning "Quick daily sync"). It should appear in that job's list, marked as yours. ❌ Not OK if it doesn't show or isn't marked.
2. **It sticks** — refresh the page. Your word should still be there. ❌ Not OK if it vanishes.
3. **Remove your word** — click remove (×) on the word you added. It should disappear. ❌ Not OK if it stays or errors.
4. **Hands off the AI's** — the AI's original words have no remove control; you can only remove your own.
5. **AI words untouched** — the original words for the job are all still there and unchanged after you add and remove yours.
