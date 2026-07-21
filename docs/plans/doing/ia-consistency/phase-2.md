# Phase 2 — Member 1:1 recap (run-detail)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
When a manager re-reads one of their past 1:1s, the screen should say whose 1:1 it is — not the generic "Past 1:1" — and offer a breadcrumb back, not a bare "Back". This is the highest-leverage fix: the file is shared, so it lands in both the member app and the superadmin view at once.

## Changes
- `admin/src/stages/run-detail.ts` (loaded by the member app via `frontend/src/main.js`):
  - Replace the generic `<h1>Past 1:1` + bespoke flat "Back" button with the shared `recapHeader(ctx, trail)` so the heading names the person and a breadcrumb (`Your 1:1s › {name}`) leads back.
  - Fix the latent nav bug: the back is hardwired to `STAGES.RUNS` (a manager-only stage) — a member hitting it bounces through the gate to Home. Route the crumb to the right destination per role.
  - Drop the stale "Role, Seniority" comment (the code already uses a middot).

## Not in this phase
- Person detail, guided screens, the admin circled-Back pages (later phases).

## Done when
- [ ] The recap heading shows the person's name + the meeting, not "Past 1:1".
- [ ] A breadcrumb replaces the flat "Back"; clicking the parent crumb lands on the member's own list (not a manager-only screen).
- [ ] `npm test` green, typecheck clean.
- [ ] Screenshot of the real rendered member screen attached.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Breadcrumb: `local > member app (a real manager login) > Past 1:1s > open one`.
1. **Heading names the 1:1** — open a past 1:1. You should see the person's name (+ the meeting type) as the heading, with a breadcrumb like `Your 1:1s › Priya` above it. ❌ Not OK if the big title still says "Past 1:1".
2. **Breadcrumb goes back** — click the first crumb. You should land back on your list of past 1:1s. ❌ Not OK if it dumps you on an empty/other screen.
3. **Recap body unchanged** — the recap cards (what stood out, honest read, etc.) read exactly as before.
