# Phase 3 — Go live

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The app is live at a public URL, and the agent can see Render's deploys and logs by itself.

## Changes
- Carl walks `RENDER_SETUP.md` (account, blueprint, secret values, first deploy, API key). ⚠️ The database value he pastes is `.env`'s **`LIVE_DATABASE_URL`** (Sero Live), not the local `DATABASE_URL` — a wrong paste = the app refuses to boot (env-guard doing its job).
- Agent stores the key at `.secrets/render-api-key` and the service id at `.secrets/render-service-id` (both gitignored, local only).
- Agent verifies via the Render API (free): service exists, latest deploy is `live`; if it failed, pull the logs, explain in plain words, fix with Carl's OK.

## Not in this phase
- The /commit and /release skills (Phase 4).

## Done when
- [ ] Render API says the latest deploy is `live` (verify the destination, not the push).
- [ ] The public URL loads the app.
- [ ] `.secrets/render-api-key` + `render-service-id` exist locally and `git status` shows neither.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **It's on the internet** — open the public URL (I'll give it to you) on your phone (not your computer, so it's really the internet). The app should load. ❌ Not OK if it errors (a ~50 s wait after idle IS ok — free plan waking up).
2. **Log in and run** — log in as yourself and complete one short run end-to-end. This is the workstream's one paid check (~$0.35). ❌ Not OK if login fails or the run errors.
