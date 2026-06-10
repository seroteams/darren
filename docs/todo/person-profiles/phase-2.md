# Phase 2 — API endpoints + auto-rebuild when a run finishes

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Profiles stay fresh on their own: finishing a 1:1 refreshes that person's profile, and the app server can list people and serve profiles.

## Changes
- **New `frontend/server/handlers/people.js`**:
  - `GET /api/people` — list (slug, name, run count, last run, profile-built timestamp)
  - `GET /api/people/:slug` — profile content + trimmed run list
  - `POST /api/people/:slug/rebuild` — awaits a rebuild (POST behind the existing `originOk` check)
- **Edit `frontend/server/server.js`** — three routes, same pattern as the `/api/runs/*` block (~line 108).
- **Edit `frontend/server/handlers/evaluation.js`** — one line in `setCached`, after `kickLexiconReview(session)`:
  `setImmediate(() => rebuildForName(session.ctx?.name).catch((e) => console.warn(...)))`
  `setImmediate` matters: `runStage` persists the session synchronously right after `setCached`, so the rebuild must run after that write. A rebuild failure warns in the log — it never blocks or breaks the run.

## Not in this phase
- Anything in the app UI (Phases 3–4)
- Model-written synthesis (Phase 5)

## Done when
- [ ] The three endpoints answer correctly
- [ ] Finishing a run updates that person's profile without touching the briefing flow
- [ ] Tests still green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **List people** — with the app running, open `localhost:3001/api/people` in the browser. You should see the people list with run counts.
2. **One person** — open `localhost:3001/api/people/maya`. You should see her profile content.
3. **The real test** — run a full 1:1 as Maya in the app, through to the final briefing. Then open `data/people/maya/profile.md`: it should now include the run you just finished, without you doing anything. ❌ Not OK if the briefing screen behaved differently than usual.
4. **Tests** — `node scripts/run-tests.js` green.
