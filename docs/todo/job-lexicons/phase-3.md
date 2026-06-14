# Phase 3 — Words reach the run

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Words you added to a job show up in a live 1:1 for that job — on the "language of this role" screen and in what the AI is told — without overwriting the AI's words.

## Changes
- `src/role-profile.js` — when a run loads a role's profile, merge your overlay words in with the AI's (same treatment, no rewriting), so they flow into `{{ROLE_PROFILE_BLOCK}}` and the run's saved snapshot.
- `frontend/server/handlers/role-profile.js` — the per-session "terminology" it returns now includes your added words.
- No gate changes: words carry no competency category, so the focus/arc filter doesn't touch them. Your words are treated exactly like the AI's — no special-casing, honouring engine honesty.

## Not in this phase
- Anything beyond words flowing through (challenges / themes stay parked).

## Done when
- [ ] A word you added to a job appears on that job's "language of this role" screen in a one-page run.
- [ ] The added word is present in the run's saved record for that session.
- [ ] Offline tests still pass (`npm test`).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself.
1. **Add then run** — add a distinctive word to a job (e.g. "Release train" / "our weekly ship cadence") on the Job lexicons page. Start a One-page run for someone in that exact job + level. On the "language of this role" screen, your word should appear alongside the AI's. ❌ Not OK if it's missing.
2. **Right job only** — start a run for a *different* job. Your added word should NOT appear there. ❌ Not OK if it leaks across jobs.
3. **AI words still there** — on the "language of this role" screen, the AI's original words are still shown too. Yours is added, not replacing.
