# Phase 2 — Hosted + spend-capped

**Part of:** [PLAN.md](PLAN.md) · **Track:** A (ship-blocker) · **Status:** ⬜

## Goal
An invited manager can reach Sero at a real URL (not localhost), spend can't run away, and a model
hiccup shows a friendly message instead of a crash.

## Changes
- Deploy Sero to a hosted target with a shareable URL and server-side secrets (keys never in the client).
- A usage/cost cap — per company and/or overall — so an alpha can't quietly run up the OpenAI bill,
  plus a simple way for Carl to see current spend.
- Graceful failure: when the model errors or times out, the user sees a plain "try again" message; the
  raw error is logged for us, never shown.

## Not in this phase
- Onboarding / first-run guidance (Phase 3).
- Any new product features.

## Done when
- [ ] The app is reachable from another device at its URL, logged-in and working end to end.
- [ ] A cost/usage cap is in place and Carl can see spend.
- [ ] A forced model failure shows a friendly message, not a stack trace.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Reach it from your phone** — Open the URL on a device that isn't your dev laptop. You should get the login screen and be able to log in and run a session. ❌ Not OK if it only works on localhost.
2. **Spend is visible** — I show you where current spend/usage is displayed. You should see a number and the cap. ❌ Not OK if there's no cap or no way to see spend.
3. **It fails kindly** — I trigger a model failure on purpose. You should see a plain "something went wrong, try again" message. ❌ Not OK if you see a raw error or the page breaks.
