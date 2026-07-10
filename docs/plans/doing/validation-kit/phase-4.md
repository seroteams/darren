# Phase 4 — New-client first-run

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A brand-new manager account can go from first login to a finished first prep with zero outside help.

## Changes
*(corrected 2026-07-10 after dependency check: a zero-run manager boots straight into INTAKE, never Home — `frontend/src/main.js:307-318` — so the guidance lives where they actually land)*
- **Intake stage** (`admin/src/stages/intake.js`, verified live via `main.js:40`) hosts the first-run guided path: a short "Here's how your first 1:1 prep works" intro (3 plain steps: who it's with → your notes → your briefing) shown only when the account has zero runs, plus contextual hints per step — including one honest example of what good notes look like.
- **Home empty state** (`admin/src/stages/start-core.js` — already fetches runs, `start-core.js:122`, and has an empty state at `:101-102`): upgrade the bare "No past sessions yet" line to match the same guided tone, for managers who navigate Home before their first prep.
- The guidance keys off "this account has zero runs" (already known client-side — no new endpoint); no tour framework, no overlays chasing the cursor.

## Not in this phase
- No changes for existing/returning managers — they never see any of this.
- No video, no multi-step coach-mark tour product — plain guided empty states only.
- Member-side (employee) views untouched.

## Done when
- [ ] A freshly created manager account sees the guided first-run; an account with ≥1 run sees the normal Home (verified with two real accounts).
- [ ] Copy passes the house rules: UK English, plain words, no exclamation marks, 14px floor.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The stranger test** — create a fresh manager account, log in, and pretend you've never seen Sero. Without any prior knowledge, can you tell what to do first and finish a prep? ❌ Not OK if at any point you'd need someone to tell you what a screen is for.
2. **It gets out of the way** — finish that first prep, go back to Home. The guidance should be gone (or shrunk to nothing intrusive). ❌ Not OK if a veteran user would still see beginner content.
3. **Honest notes hint** — on the notes step as a new user, you should see one example of what useful notes look like. ❌ Not OK if it's generic fluff ("write some notes!") rather than a real example.
