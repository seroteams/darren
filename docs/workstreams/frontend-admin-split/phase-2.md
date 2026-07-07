# Phase 2 — Stand up the customer app

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Bring `frontend/` to life as a real, separate app that imports the Phase-1 `shared/` code plus **only the customer stages** — login/register, the prep flow, and member Home · Team · Runs. Admin app stays exactly as it is; now there are two apps.

## Changes
- New Vite app in `frontend/` (its own `index.html`, entry, config), served on its own dev port.
- Its stage map includes only customer screens: login, register, intake, onepage, focus-points, preparation, bank, questioning, eval, briefing, run-debrief, member-home, team, runs.
- Reuse the customer stage files from `admin/src/stages/` for now (imported/shared) — do **not** delete them from admin yet (that's Phase 3).
- Wire the customer app's router to only the customer paths; no admin routes exist in it.

## Not in this phase
- Removing anything from the admin app (Phase 3).
- Final hosting/serving wiring (Phase 4) — dev ports are fine here.

## Done when
- [ ] The customer app runs on its own dev URL and a full prep run works in it.
- [ ] No admin tool is reachable in the customer app (no route, no nav item).
- [ ] The admin app is unchanged and still works.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Customer app, happy path** — open the customer app's URL, log in, complete a full prep run. You should see the same prep experience as today. ❌ Not OK if any step breaks.
2. **No admin leakage** — in the customer app, try to reach an admin tool (type an admin path in the URL, look for any admin nav). You should land back in the member app or a not-found — never an admin tool. ❌ Not OK if any internal tool shows.
3. **Member rail** — the customer app shows Home · Team · Runs (+ Log out) and lands on Home. ❌ Not OK if the full admin rail appears.
4. **Admin app untouched** — open the admin app URL; full toolset still there and working. ❌ Not OK if anything is missing.
