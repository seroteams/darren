# Phase 3 — Live rollout

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Google sign-in works on the live app, proven by a real walk.

## Changes
- No new code. Carl publishes the Google consent screen to Production (one button in console.cloud.google.com → OAuth consent screen → Publish app) and enters `GOOGLE_CLIENT_SECRET` in the Render dashboard when prompted (the `sync: false` key ships in Phase 1's render.yaml change).
- Push to `main` on Carl's go-live; Render deploys.
- `docs/reference/RENDER_SETUP.md` gains the two variable names.

## Not in this phase
- Any behaviour change. If the live walk surfaces copy tweaks, they are tiny follow-ups here, nothing more.

## Done when
- [ ] Live walk below passes on sero-obwq.onrender.com
- [ ] Carl has tested and said go

## Test scenarios — for the product owner
Breadcrumb: `live > sero-obwq.onrender.com > /login` (use a normal browser window, not incognito with blocked cookies).

1. **Fresh Gmail signup** — Continue with Google using a Google account Sero has never seen. You land logged in with the demo workspace, and the new-signup alert email arrives in your inbox.
2. **Your own account links** — Continue with Google as carl@seroteams.com. You land in YOUR existing account (no new company). Password login for it still works afterwards.
3. **Invited teammate** — invite a Google-owned test address from the team screen, then have that address use Continue with Google (not the invite link). It lands as a member of your company and the new-member email arrives.
4. **Cancel** — cancel on Google's screen; friendly message, app fine.
