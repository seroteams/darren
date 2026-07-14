# Phase 2 — Right doors, right roles

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A member only ever sees member things, arrives at the same home every time, and a manager never sees QA machinery.

## Changes
- **One role-resolved home per app** — a single "where does this user land" helper used by login, register, boot, and back/forward guard, so login and reload agree ([login.js:99-103](../../../admin/src/stages/login.js) vs [main.js:342](../../../admin/src/main.js)). Admin app member home = `/runs` (Past 1:1s); the login path stops sending members to `/home` there. (B1) *Wiring constraint (verified): shared stages resolve the ADMIN router even in the customer build — cross-imports are relative, no aliases. The helper must be passed INTO login/register via each app's ctx/store from its own main.js; a shared stage must never import a router directly.*
- **Role-gate the prep flow** — in the customer app, `/new` and every start CTA check role before rendering; a member who somehow hits the URL gets a kind bounce to their home, not Step 1 of a forbidden flow. (B2)
- **Retire the dead member run-detail route** — remove RUN_DETAIL from the member route sets until it has member data to show. (B6)
- **Person deep-links survive** — PERSON_DETAIL hydrates from the URL param on boot instead of bouncing to Team through the "NO ONE SELECTED" flash; the interstitial gets a styled loading state. (M9, X7)
- **QA verdict page goes internal** — REVIEW_RUN joins INTERNAL_ONLY in [router.js](../../../admin/src/router.js); the manager's "Review" action on Home opens the normal run detail (Overview/Briefing tabs) instead. (M4) *Feasibility (verified): `runs/mine` supports `includeOpen` (runs.repo.ts:83) and `mineDetail` reads any owned run — so in-progress briefing-stage runs can open in run detail. Confirm the flag at build; if an edge case can't render, fall back to resuming the session at its briefing screen.*

## Not in this phase
- Member copy/About rewrites (Phase 3). Any new member capability (Parked).

## Done when
- [ ] Member login and member reload land on the identical screen in BOTH apps (verify the rendered URL + heading, not the routing code).
- [ ] A member navigating to /new in the customer app never sees "Who are you prepping for?".
- [ ] A manager clicking Review sees run detail — zero engine hashes, judged counts, or Keep/Fix/Block anywhere in their session.
- [ ] Refreshing /team/<id> stays on that person.
- [ ] `npm test` + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Use the dev login switcher (Member) on localhost:3000, and member@seroteams.com on localhost:3002.
1. **Same home twice (the split-brain)** — log in as Member on the admin app; note the screen. Press F5. You should see the SAME heading both times. ❌ Not OK if login shows "Welcome to Sero" and reload shows "Past 1:1s".
2. **The forbidden door is shut** — as a member on the customer app, type /new into the address bar. You should be bounced gently to your own 1:1 list. ❌ Not OK if you see "Who are you prepping for?".
3. **No more QA machinery** — as manager, Home → expand Maya's session → Review. You should see the normal run page (Overview / Briefing / Answers). ❌ Not OK if you can find "0/8 judged", Pass/Fail buttons, or Keep/Fix/Block anywhere while logged in as manager.
4. **Person page survives refresh** — open Priya's page and press F5. You should stay on Priya. ❌ Not OK if you land back on the Team list or glimpse "NO ONE SELECTED".
5. **Member About check (preview of Phase 3)** — as member, open What is Sero?. The "Start a 1:1" button should be gone or member-appropriate already (the full copy rewrite comes next phase).
