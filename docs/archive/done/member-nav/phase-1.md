# Phase 1 — Member shell (Home · Team · Runs)

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done (walked + green-lit 2026-07-01; landing fix `fc77b8ba`)

## Goal
A member logs in, lands on a **Home** page, and sees a rail of exactly **Home · Team · Runs** (+ Log out). Team and Runs open simple placeholder pages. Admins are untouched. All frontend — no backend, no real run data yet.

## Changes
- **Nav rail** ([admin/src/ui/app-nav.js](../../../../admin/src/ui/app-nav.js)) — introduce a member set of links (Home, Team, Runs). Simplest approach: mark links with a `member: true` flag and, when the user is not an admin, render only those three. Admin path keeps today's full list. Add icons + `onNav` + active-highlight entries for the two new keys.
- **New stages** ([admin/src/state.js](../../../../admin/src/state.js)) — add `TEAM` (and, if we don't reuse an existing one, a member `RUNS`) stage keys. Home reuses the existing `START` stage for members but with a member-appropriate page; Runs gets its own stage.
- **Two placeholder pages** — `admin/src/stages/team.js` and `admin/src/stages/runs.js`, each a plain "coming soon" panel matching existing stage style. Register both in the `loaders` map + `router.js` (`PATH_FOR`, `STAGE_FOR`) so they get real URLs (`/team`, `/runs`).
- **Member landing** ([admin/src/main.js](../../../../admin/src/main.js) boot) — a member logs in and lands on **Home** instead of being forced into `/new`. Home shows a clear **Start a new session** button so the old entry point still works.
- **Deep-link guards** ([admin/src/router.js](../../../../admin/src/router.js)) — Home/Team/Runs are allowed for members; the admin-only set stays bounced. A member hitting an admin URL still gets redirected to Home.

## Not in this phase
- Real Runs data / any backend change (Phase 2).
- Real Team content — placeholder only.
- Any change to the admin rail or admin landing.

## Done when
- [ ] Member rail shows exactly Home · Team · Runs (+ Log out) — nothing else.
- [ ] Member lands on Home on login and can start a new session from there.
- [ ] Team and Runs open placeholder pages at `/team` and `/runs`.
- [ ] Admin login is visually identical to before (full rail, admin Home).
- [ ] `npm test` green (offline baseline noted before starting).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Member rail** — log in as a Standard (member) user. You should see only **Home, Team, Runs** and **Log out** in the left rail. ❌ Not OK if Library, Compare, Personas, Guide, etc. show.
2. **Member lands on Home** — right after logging in as a member, you should be on the **Home** page (not dropped into a New-session form). ❌ Not OK if you land mid-flow.
3. **Start a session from Home** — on member Home, click **Start a new session**. You should enter the normal prep flow. ❌ Not OK if there's no way to start one.
4. **Team placeholder** — click **Team**. You should see a simple "coming soon" page and the URL should be `/team`.
5. **Runs placeholder** — click **Runs**. You should see a placeholder page and the URL should be `/runs`.
6. **Member can't sneak in** — as a member, type an admin URL in the address bar (e.g. `/library` or `/personas`). You should be bounced back to Home, not shown the tool.
7. **Admin untouched** — log in as an Admin. The full rail and admin Home should look exactly as they do today. ❌ Not OK if anything about the admin view changed.
