# Phase 3 — Save prompt + claim wiring

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
A guest who finishes a run is invited to keep it: create an account (or log in) and the run automatically becomes theirs, landing in their Past 1:1s.

## Changes
- `shared/api.js`: add `claimSession(id)` → `POST /api/v1/sessions/:id/claim`.
- `admin/src/stages/briefing.js`: when `!store.user` — hide the in-flow star rating (would 401) and the internal "Finish & review this run" / QA controls; show a save card instead: *"Want to keep this 1:1? **Create a free account** — we'll save it for you"* → REGISTER · *"Already have an account? **Log in**"* → LOGIN. Set `localStorage.seroClaimSessionId` before navigating.
- `admin/src/stages/login.js` + `register.js` success paths: if the claim marker exists → `claimSession(id)`; on success clear the marker **and** `seroSessionId` (so boot never resumes the finished run), then land on RUN_DETAIL for that run. On claim failure (404/network): clear the marker, land per role as today — never a dead end.

## Not in this phase
- Superadmin Guest runs screen — Phase 4.
- Email verification, guest feedback.

## Done when
- [ ] Free QA green first (scenario 1).
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has walked the scenarios below — including the ONE approved paid walk — and said go.

## Test scenarios — for the product owner
Scenario 1 is free. Scenarios 2–3 are ONE paid end-to-end walk (~$0.35–0.60 of OpenAI spend) — **it does not run until you say go for that specific walk.** Next phase waits for your green light.

1. **A broken save never strands anyone (free)** — I plant a bogus saved-run marker, then you log in. You land on your normal home as always, no error wall, no dead end. ❌ Not OK if login hangs or errors because a claim failed.
2. **The full guest story (paid, on your go)** — as a guest, run a full 1:1: intake → questions → briefing. At the end there's **no star rating and no "Finish & review"** — instead the save card: "Want to keep this 1:1?". Click **Create a free account**, register fresh. You land straight on that run's page, saved under the new account. ❌ Not OK if the rating/QA controls show for a guest, or the run is lost after registering.
3. **It's really theirs (same walk)** — in the new account: the run shows in **Past 1:1s** and on START's recents; in **User management** the new account shows 1 run. ❌ Not OK if the run is still ownerless or visible to any other company.
